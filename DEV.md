
## Development

*Start Grafana*

````
docker run -it -v $PWD:/var/lib/grafana/plugins/grafana-dot-panel -p 3000:3000 --name grafana.docker grafana/grafana
````

*Build the plugin and watch for changes*

````
# Install development packages
npm install

# Install the grunt-cli
sudo npm install -g grunt-cli

# Compile into dist/
grunt

# Restart Grafana to see it
docker restart grafana.docker

# Watch for changes (requires refresh)
grunt watch
````
