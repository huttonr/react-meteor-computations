## ReactMeteorComputations

### Introduction
ReactMeteorComputations is [Meteor](https://github.com/meteor/meteor) package supplying
a custom React mixin `ReactMeteorComputations` which enables Meteor reactivity (Tracker) in React.

It is designed as a substitute for ReactMeteorData.

### Quick Usage

`meteor add huttonr:react-meteor-computations`

The basic structure then is:

```jsx
TestMessage = React.createClass({
  mixins: [ReactMeteorComputations],

  computations: {
    message() {
      return Session.get('lastMessage')
    },
    
    name() {
      return Session.get('playerName')
    }
  },

  render() {
    return (
      <div>
        <span>Name: {this.state.name}</span>
        <br/>
        <span>Message: {this.state.message}</span>
      </div>
    )
  }
})
```

### Advanced Examples
###### *Coming soon...*
