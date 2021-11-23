require('@orbiting/backend-modules-env').config()
const debug = require('debug')('mail:script:sendMailsToSegment')
const Promise = require('bluebird')

const { getTemplates, envMergeVars } = require('../../lib/sendMailTemplate')
const MandrillInterface = require('../../MandrillInterface')
const NodemailerInterface = require('../../NodemailerInterface')
const sendResultNormalizer = require('../../utils/sendResultNormalizer')
const shouldSendMessage = require('../../utils/shouldSendMessage')
const { send } = require('../../lib/mailLog')

const {
  DEFAULT_MAIL_FROM_ADDRESS,
  DEFAULT_MAIL_FROM_NAME,
  SEND_MAILS_SUBJECT_PREFIX,
  SEND_MAILS_TAGS,
} = process.env

module.exports = async (segment, mail, context) => {
  const { argv, pgdb } = context
  const tags = []
    .concat(SEND_MAILS_TAGS && SEND_MAILS_TAGS.split(','))
    .concat(mail.templateName && mail.templateName)
    .filter(Boolean)
  const { html, text } = await getTemplates(mail.templateName)

  const message = {
    subject:
      (SEND_MAILS_SUBJECT_PREFIX &&
        `[${SEND_MAILS_SUBJECT_PREFIX}] ${mail.subject}`) ||
      mail.subject,
    from_email: mail.fromEmail || DEFAULT_MAIL_FROM_ADDRESS,
    from_name: mail.fromName || DEFAULT_MAIL_FROM_NAME,
    html,
    text: text || mail.text,
    merge_language: 'handlebars',
    global_merge_vars: envMergeVars,
    auto_text: !text,
    tags,
    attachments: mail.attachments,
  }

  debug({
    ...message,
    numberAddressesInSegment: segment.length,
  })

  await Promise.each(segment, async (emailAddress) => {
    message.to = [{ email: emailAddress }]

    const sendFunc = sendResultNormalizer(
      false, // shouldScheduleMessage
      shouldSendMessage(message),
      async () => {
        // Backup method to send emails
        const nodemailer = NodemailerInterface({ logger: console })
        if (nodemailer.isUsable(mail, message)) {
          return nodemailer.send(message)
        }

        // Default method to send emails
        const mandrill = MandrillInterface({ logger: console })
        if (mandrill.isUsable(mail, message)) {
          if (argv.dryRun) {
            return [{ status: 'sent', interface: 'Mandrill' }]
          }
          return mandrill.send(
            message,
            !message.html ? mail.templateName : false,
            [],
          )
        }

        return [{ error: 'No mailing interface usable', status: 'error' }]
      },
    )

    if (argv.dryRun) {
      console.log(mail.templateName, emailAddress)
      return
    }
    const sentData = await send({
      log: { onceFor: { type: mail.templateName, email: emailAddress } },
      sendFunc,
      message: {
        ...message,
        html: !!message.html,
        text: !!message.text,
        attachments: message.attachments?.map(({ name, type }) => ({
          name,
          type,
        })),
      },
      email: emailAddress,
      template: mail.templateName,
      context: { pgdb },
    })

    if (!sentData) {
      debug(`mail ${mail.templateName} already sent to ${emailAddress}`)
      return
    }

    console.log(
      mail.templateName,
      emailAddress,
      sentData.mailLogId,
      sentData.result,
    )
  })
}
