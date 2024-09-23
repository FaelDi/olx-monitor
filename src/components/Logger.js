import config from '/src/config'
import SimpleNodeLogger from 'simple-node-logger'
logger = SimpleNodeLogger.createSimpleLogger( config.logger );

module.exports = logger
