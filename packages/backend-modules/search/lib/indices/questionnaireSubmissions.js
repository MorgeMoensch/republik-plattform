const type = 'QuestionnaireSubmission'

module.exports = {
  type,
  name: type.toLowerCase(),
  path: 'public.questionnaireSubmissions',
  searchable: false,
  mapping: {
    [type]: {
      dynamic: false,
      properties: {
        id: {
          type: 'keyword',
        },
        questionnaireId: {
          type: 'keyword',
        },
        userId: {
          type: 'keyword',
        },
        createdAt: {
          type: 'date',
        },

        resolved: {
          properties: {
            answers: {
              properties: {
                payload: {
                  properties: {
                    text: {
                      type: 'text',
                      analyzer: 'german',
                    },
                  },
                },
                resolved: {
                  properties: {
                    payload: {
                      properties: {
                        value: {
                          properties: {
                            Choice: {
                              type: 'keyword',
                            },
                            Document: {
                              type: 'keyword',
                            },
                            Range: {
                              type: 'long',
                            },
                            Text: {
                              type: 'text',
                              analyzer: 'german',
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
}
