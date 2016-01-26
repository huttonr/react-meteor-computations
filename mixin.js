
ReactMeteorComputations = {
  componentWillMount() {
    this._setState = this.setState
    this.setState = function (partialState, callback) {
      // TODO: catch calls to setState
      if (typeof partialState === 'function') partialState = partialState()

      for (let k in this._stateDependencies) {
        let d = this._stateDependencies[k]
        if (!d.cond || d.cond.apply(this, [partialState])) d.dep.changed()
      }

      return this._setState(partialState, callback)
    }

    this._forceUpdate = this.forceUpdate
    this.forceUpdate = function (callback) {
      for (let k in this._stateDependencies) {
        this._stateDependencies[k].dep.changed()
      }

      for (let k in this._propDependencies) {
        this._propDependencies[k].dep.changed()
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

    Tracker.flush() // This ensures 'setState's occur immediately
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
          let setStateFunc = context.setState   // save setState
          context.setState = function () {      // override setState
            console.error(`\
You cannot call setState within a computation built by the ReactMeteorComputations mixin. \
This is an anti-pattern and can create infinite loops.\
            `)
          }
          let res = context.computations[name].apply(context, [
            new ReactDependency(c, context, name),
            (dataset) => new ReturnSet(dataset)
          ])
          context.setState = setStateFunc       // restore setState
          if (! (res instanceof ReturnSet)) {
            res = new ReturnSet({[name]: res})  // Inefficient, but fine for now
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
