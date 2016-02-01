
ReactMeteorComputations = {
  componentWillMount() {
    let storage = this._reactMeteorComputations = {}

    // Proxy setState
    this._setState = this.setState
    this.setState = function (partialState, callback) {
      if (typeof partialState === 'function') partialState = partialState(this.state, this.props)
      if (typeof partialState !== 'object') {
        // We'll let React throw the inevitable error
        return this._setState(...arguments)
      }

      for (let k in storage._stateDependencies) {
        let d = storage._stateDependencies[k]
        if (!d.cond || d.cond.apply(this, [partialState])) d.dep.changed()
      }

      return callback ? this._setState(partialState, callback) : this._setState(partialState)
    }

    // Proxy replaceState
    this._replaceState = this.replaceState
    this.replaceState = function (nextState, callback) {
      if (typeof nextState !== 'object') {
        // We'll let React throw the inevitable error
        return this._replaceState(...arguments)
      }

      for (let k in storage._stateDependencies) {
        let d = storage._stateDependencies[k]
        if (!d.cond || d.cond.apply(this, [nextState])) d.dep.changed()
      }

      return callback ? this._replaceState(nextState, callback) : this._replaceState(nextState)
    }

    // Proxy forceUpdate
    this._forceUpdate = this.forceUpdate
    this.forceUpdate = function (callback) {
      for (let k in storage._stateDependencies) {
        let d = storage._stateDependencies[k]
        d.dep.changed()
      }

      for (let k in storage._propDependencies) {
        let d = storage._propDependencies[k]
        d.dep.changed()
      }

      try {
        Tracker.flush() // This ensures 'setState's occur immediately
      } catch(e) {}

      return this._forceUpdate(...arguments)
    }



    if (!storage._savedComputations) storage._savedComputations = []
    if (storage._savedComputations.length) destroyComps(context)

    storage._propDependencies = {}
    storage._stateDependencies = {}

    for (let name in this.computations) {
      storage._savedComputations.push(
        Tracker.nonreactive(() => (
          Tracker.autorun((c) => {
            if (!storage._nextState) {
              // This gets the nextState so we aren't calling the computations with a "stale" state
              // it also flattens the state queue which will make it more efficient later anyway
              let internal = this._reactInternalInstance
              if (internal._pendingStateQueue) {
                let nextState = internal._processPendingState(this.props, this.context)
                internal._pendingStateQueue = [nextState]
                storage._nextState = Object.assign({}, nextState)
              } else {
                // Looks like no new state except possibly states created by this mixin, so skip it
                storage._nextState = this.state
              }
            }
            let savedState = this.state        // Save state
            this.state = storage._nextState    // Set state to nextState
            let setStateFunc = this.setState   // Save setState
            this.setState = function () {      // Override setState
              console.error(`\
You cannot call setState within a computation built by the ReactMeteorComputations mixin. \
This is an anti-pattern and can create infinite loops.\
              `)
            }

            let reactDep = new ReactDependency(c, this, name)
            let res = this.computations[name].apply(this, [
              reactDep,
              (dataset) => new ReturnSet(dataset)
            ])

            this.state = savedState            // Restore state
            this.setState = setStateFunc       // Restore setState

            reactDep.ensureIsSetOrDefaultAll()

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

            this._setState(res._dataset) // Call direct
          })
        ))
      )
    }
  },

  componentWillUnmount() {
    let storage = this._reactMeteorComputations

    for (let comp of storage._savedComputations) {
      comp.stop()
    }

    storage._savedComputations = []
    this._reactMeteorComputations = {}
  },

  componentWillReceiveProps(nextProps) {
    let storage = this._reactMeteorComputations

    for (let k in storage._propDependencies) {
      let d = storage._propDependencies[k]
      if (!d.cond || d.cond.apply(this, [nextProps])) d.dep.changed()
    }

    let savedProps = this.props   // Save props
    this.props = nextProps        // Set props to nextProps
    try {
      Tracker.flush()             // This ensures 'setState's occur immediately
    } catch(e) {}
    this.props = savedProps       // Restore props
  },

  componentDidUpdate() {
    let storage = this._reactMeteorComputations

    storage._nextState = undefined
  },

  rerunAllComputations() {
    let storage = this._reactMeteorComputations

    for (let c of storage._savedComputations) {
      c.invalidate()
    }
  }
}



class ReactDependency {
  constructor(computation, context, name) {
    this._computation = computation
    this._context = context
    this._name = name
    this._isSet = false
  }

  ensureIsSetOrDefaultAll() {
    if (!this._isSet) this.all()

    return this
  }

  none() {
    this._isSet = true

    return this
  }

  all() {
    this._isSet = true

    this.props()
    this.state()

    return this
  }

  props(cond) {
    this._isSet = true

    let propDeps = this._context._reactMeteorComputations._propDependencies
    if (this._computation.firstRun) { // Only interested in first run, don't want to rebuild every update
      let dep = new Tracker.Dependency
      propDeps[this._name] = {dep, cond}
    }

    this._context._reactMeteorComputations._propDependencies[this._name].dep.depend()

    return this
  }

  state(cond) {
    this._isSet = true

    let stateDeps = this._context._reactMeteorComputations._stateDependencies
    if (this._computation.firstRun) { // Only interested in first run, don't want to rebuild every update
      let dep = new Tracker.Dependency
      stateDeps[this._name] = {dep, cond}
    }

    stateDeps[this._name].dep.depend()

    return this
  }
}

class ReturnSet {
  constructor(dataset) {
    this._dataset = dataset
  }
}
