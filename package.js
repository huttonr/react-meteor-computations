Package.describe({
  name: 'react-meteor-computations',
  version: '0.3.3',
  summary: 'A nice alternative to ReactMeteorData.',
  git: 'https://github.com/huttonr/react-meteor-computations',
  documentation: 'README.md'
});

Package.onUse(function(api) {
  api.versionsFrom('1.2.1');
  api.use('ecmascript');
  api.use('tracker');

  api.export(['ReactMeteorComputations'])

  api.addFiles('mixin.js');
});
