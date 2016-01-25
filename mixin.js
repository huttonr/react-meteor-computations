
ReactMeteorComputations = {
  componentWillMount() {
    buildComps(this)
  },

  componentWillUnmount() {
    destroyComps(this)
  },

  rerunAllComputations() {
    buildComps(this) // This also first destroys the comps
  }
}

function buildComps(context) {
  if (!context._savedComputations) context._savedComputations = []
  if (context._savedComputations.length) destroyComps(context)

  for (let name in context.computations) {
    context._savedComputations.push(
      Tracker.nonreactive(() => {
        Tracker.autorun(() => {
          let res = context.computations[name].apply(context, (dataset) => new ReturnSet(dataset))
          if (! (res instanceof ReturnSet)) {
            res = new ReturnSet(res) // Inefficient, but fine for now
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

          context.setState(res._dataset)
        })
      })
    )
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
