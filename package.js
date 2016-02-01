Package.describe({
  name: 'huttonr:react-meteor-computations',
  version: '0.3.4',
  summary: 'A nice alternative to ReactMeteorData.',
  git: 'https://github.com/huttonr/react-meteor-computations',
  documentation: null // README was giving troubles
});

Package.onUse(function(api) {
  api.versionsFrom('1.2.1');
  api.use('ecmascript');
  api.use('tracker');

  api.export(['ReactMeteorComputations'], 'client')

  api.addFiles('mixin.js');
});
