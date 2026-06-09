const fs = require('fs')
const path = require('path')

module.exports = function getFoundingEmail(name) {
  const template = fs.readFileSync(path.join(__dirname, 'foundingEmail.html'), 'utf8')
  return template.replace('[First Name]', name)
}