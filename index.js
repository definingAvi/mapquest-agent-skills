const path = require('path');
const pkg = require('./package.json');

/**
 * Returns all available skills with their absolute paths resolved.
 */
function getSkills() {
  return pkg.skills.map(skill => ({
    ...skill,
    absolutePath: path.resolve(__dirname, skill.path),
  }));
}

/**
 * Returns a single skill by name, or undefined if not found.
 */
function getSkill(name) {
  return getSkills().find(s => s.name === name);
}

module.exports = { getSkills, getSkill };
