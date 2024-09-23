import config from '/src/config.js'
import SimpleNodeLogger from 'simple-node-logger'
logger = SimpleNodeLogger.createSimpleLogger( config.logger );

module.exports = logger
