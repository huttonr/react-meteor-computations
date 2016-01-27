## ReactMeteorComputations

###### Under construction...

### Introduction
ReactMeteorComputations is [Meteor](https://github.com/meteor/meteor) package supplying
a custom React mixin `ReactMeteorComputations` which enables Meteor reactivity (Tracker) in React.

**It is designed as a substitute for ReactMeteorData which has the following pitfalls:**

* The ReactMeteorData mixin forces all updates to reactive sources to update/rerender the component, completely bypassing `shouldComponentUpdate` making it impossible to increase update efficiency without creating individual wrapper components.
* All reactive dependencies are put into a single computation which is rerun *in its entirety* any time any of the dependencies change, meaning if you have five fetches from five different Mongo collections, they will all re-fetch if a single one of them changes.
* Any changes made to props or state causing a component update also force and update of all reactive dependencies with no way to individually specify which reactive sources to update based on the props/state change.
* Data from the reactive sources are not placed into `this.state` but instead are placed into `this.data` which, although is a proposed and possibly future React design, does not feel the same as having the data in state (with the rest of your state) where a React component would ordinarly store it.

**ReactMeteorComputations seeks to address these issues in following manner:**

* No forced updates.  `shouldComponentUpdate` works fully and a change in a reactive dependency does not have to trigger an update/rerender of the component.
* Reactive dependencies are put into seperate computations so they don't all rerun when one changes.
* Though seperate computations are used there is still support to return multiple datapoints from a single computation if you feel it would be more efficient (such as a one result being a subset of another).
* All reactive data changes are queued into a component's state with `this.setState`.  No `this.data` just the usual `this.state`.
* You may selectively depend on state and props changes (or not), meaning you can check to see if a specific prop changed in a certain way before rerunning a computation and skip rerunning it if it doesn't pass.  Think `shouldComponentUpdate` but for each of the reactive computations.  You can also set your computation to only rerun on a props change (and of course if its dependencies trigger).

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
