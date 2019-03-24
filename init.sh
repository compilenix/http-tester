#!/bin/bash
unset npm_config_prefix
export NVM_DIR="$(realpath $HOME/.nvm)"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh" || {
  echo "you need nvm (https://github.com/creationix/nvm)"; exit 1
}

rm -r node_modules

nvm i
npm i
