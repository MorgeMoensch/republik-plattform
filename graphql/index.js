const { loadModule, addTypes, merge } = require('apollo-modules-node')
const { graphql: auth } = require('@orbiting/backend-modules-auth')
const { graphql: scalars } = require('@orbiting/backend-modules-scalars')
const local = addTypes(loadModule(__dirname), [scalars])
module.exports = merge(local, [auth])
