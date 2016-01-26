
ReactMeteorComputations = {
  componentWillMount() {
    this._setState = this.setState
    this.setState = function (partialState, callback) {
      if (typeof partialState === 'function') partialState = partialState(this.state, this.props)
      if (typeof partialState !== 'object') {
        // We'll let React throw the error
        return this._setState(...arguments)
      }

      for (let k in this._stateDependencies) {
        let d = this._stateDependencies[k]
        if (!d.cond || d.cond.apply(this, [partialState])) d.dep.changed()
      }

      return callback ? this._setState(partialState, callback) : this._setState(partialState)
    }

    this._replaceState = this.replaceState
    this.replaceState = function (nextState, callback) {
      if (typeof nextState !== 'object') {
        // We'll let React throw the error
        return this._replaceState(...arguments)
      }

      for (let k in this._stateDependencies) {
        let d = this._stateDependencies[k]
        if (!d.cond || d.cond.apply(this, [nextState])) d.dep.changed()
      }

      return callback ? this._replaceState(nextState, callback) : this._replaceState(nextState)
    }

    this._forceUpdate = this.forceUpdate
    this.forceUpdate = function (callback) {
      for (let k in this._stateDependencies) {
        let d = this._stateDependencies[k]
        d.dep.changed()
      }

      for (let k in this._propDependencies) {
        let d = this._propDependencies[k]
        d.dep.changed()
      }

      Tracker.flush() // This ensures 'setState's occur immediately

      return this._forceUpdate(...arguments)
    }

    buildComps(this)
  },

  componentWillUnmount() {
    destroyComps(this)
  },

  componentWillReceiveProps(nextProps) {
    for (let k in this._propDependencies) {
      let d = this._propDependencies[k]
      if (!d.cond || d.cond.apply(this, [nextProps])) d.dep.changed()
    }

    let savedProps = this.props   // Save props
    this.props = nextProps        // Set props to nextProps
    Tracker.flush()               // This ensures 'setState's occur immediately
    this.props = savedProps       // Restore props
  },

  componentDidUpdate() {
    this._nextState = undefined
  },

  rerunAllComputations() {
    for (let c of this._savedComputations) {
      c.invalidate()
    }
  }
}

function buildComps(context) {
  if (!context._savedComputations) context._savedComputations = []
  if (context._savedComputations.length) destroyComps(context)

  context._propDependencies = {}
  context._stateDependencies = {}

  for (let name in context.computations) {
    context._savedComputations.push(
      Tracker.nonreactive(() => (
        Tracker.autorun((c) => {
          if (!context._nextState) {
            // This gets the nextState so we aren't calling the computations with a "stale" state
            context._nextState = context._reactInternalInstance._processPendingState(context.props, context.context)
          }
          let savedState = context.state        // Save state
          context.state = context._nextState    // Set state to nextState
          let setStateFunc = context.setState   // Save setState
          context.setState = function () {      // Override setState
            console.error(`\
You cannot call setState within a computation built by the ReactMeteorComputations mixin. \
This is an anti-pattern and can create infinite loops.\
            `)
          }
          let res = context.computations[name].apply(context, [
            new ReactDependency(c, context, name),
            (dataset) => new ReturnSet(dataset)
          ])
          context.state = savedState            // Restore state
          context.setState = setStateFunc       // Restore setState
          if (! (res instanceof ReturnSet)) {
            res = new ReturnSet({[name]: res})
          }

          for (let key in res._dataset) {
            if (Package.mongo && Package.mongo.Mongo && res instanceof Package.mongo.Mongo.Cursor) {
              console.warn(`\
Warning: you are returning a Mongo cursor from a computations function. \
This value will not be reactive. You probably want to call '.fetch()' \
on the cursor before returning it.`
              )
            }
          }

          context._setState(res._dataset) // Call direct
        })
      ))
    )
  }
}


class ReactDependency {
  constructor(computation, context, name) {
    this._computation = computation
    this._context = context
    this._name = name
  }

  props(cond) {
    if (this._computation.firstRun) { // Only interested in first run, don't want to rebuild every update
      let dep = new Tracker.Dependency
      this._context._propDependencies[this._name] = {dep, cond}
    }

    this._context._propDependencies[this._name].dep.depend()
  }

  state(cond) {
    if (this._computation.firstRun) { // Only interested in first run, don't want to rebuild every update
      let dep = new Tracker.Dependency
      this._context._stateDependencies[this._name] = {dep, cond}
    }

    this._context._stateDependencies[this._name].dep.depend()
  }
}

class ReturnSet {
  constructor(dataset) {
    this._dataset = dataset
  }
}

function destroyComps(context) {
  for (let comp of context._savedComputations) {
    comp.stop()
  }

  context._savedComputations = []
}
