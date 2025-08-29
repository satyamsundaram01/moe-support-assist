import { promises as fs } from "fs"
import yaml from "js-yaml"

export async function loadApiConfig(configPath) {
  if (configPath.endsWith('.json')) {
    const data = await fs.readFile(configPath, 'utf-8')
    return JSON.parse(data)
  } else if (configPath.endsWith('.yaml') || configPath.endsWith('.yml')) {
    const data = await fs.readFile(configPath, 'utf-8')
    return yaml.load(data)
  } else {
    throw new Error('Unsupported config file type')
  }
}