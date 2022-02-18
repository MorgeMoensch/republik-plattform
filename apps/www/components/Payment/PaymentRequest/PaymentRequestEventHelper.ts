import {
  PaymentMethod,
  PaymentRequestPaymentMethodEvent,
} from '@stripe/stripe-js'

type Address = {
  name: string
  line1: string
  line2?: string
  postalCode: string
  city: string
  country: string
}

type PaymentInformation = {
  email: string
  firstName: string
  lastName: string
  shippingAddress?: Address
  paymentMethod: PaymentMethod
}

export function getPaymentInformationFromEvent(
  event: PaymentRequestPaymentMethodEvent,
): PaymentInformation {
  const [firstName, lastName] = event.payerName.split(' ').map((s) => s.trim())

  return {
    email: event.payerEmail,
    firstName,
    lastName,
    shippingAddress: event.shippingAddress
      ? {
          name: event.shippingAddress.recipient,
          line1:
            event.shippingAddress.addressLine.length > 0
              ? event.shippingAddress.addressLine[0]
              : '',
          line2:
            event.shippingAddress.addressLine.length > 1
              ? event.shippingAddress.addressLine.slice(1).join(', ')
              : undefined,
          postalCode: event.shippingAddress.postalCode,
          city: event.shippingAddress.city,
          country: event.shippingAddress.country,
        }
      : undefined,
    paymentMethod: event.paymentMethod,
  }
}
