Package.describe({
  name: 'react-meteor-computations',
  version: '0.0.1',
  summary: 'The beauty of Meteor\'s Tracker brought to React, simply and efficiently in this tiny mixin.  A nice substitute for ReactMeteorData.',
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
