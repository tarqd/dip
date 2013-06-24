# dip - Dependency Injector w/ Promise Support


### What is it?

`dip` provides dependency injection with automatic promise resolution, parent/child relationships and factory dependencies

It's very similiar to angular's dependency injector, but works much better with standalone functions and on-the-fly dependencies (for example if you wanted to register a 'request' dependency that resolves to the current http request)

For now unresolved dependencies will resolve to `undefined`

### Installation

`npm install --save dip`


### Examples
#### Creating a dependency injector and a function that has dependencies
```javascript
var DI = require('dip')
var di = new DI({'foo': 'Hello', 'bar': 'World'})

function fn(foo, bar){
	return foo + ', ' + bar + '!'
}
```

#### Basic function call
```javascript
 di.call(function(foo){
     console.log(foo) // foo == 'Hello'
})
```

#### Manually specifying dependencies
```javascript
DI.inject(fn, ['foo'])
// When you specify dependencies you can pass additional arguments, only specified dependencies will be resolved
// returns a promise for the result
di.call(fn, context, 'Guys', 'more args').then(function(result){
	console.log(result) // result == 'Hello, Guys!'
})
````

#### Creating a resolved function (returns a promise)
```javascript
var fn = di.resolved(fn)
fn().then(function(result){
	console.log(result) // result == 'Hello, World!'
})
```

#### Getting an resolved function (returns the return value)
```javascript
di.resolver(fn).then(function(resolvedFN){
	console.log(resolvedFN()) // returns 'Hello, World!', no promise!
})
```

#### Manually resolving an array of dependencies
``` javascript 
// returns an array of dependencies either from the parameter names or specified manually via DI.inject(fn, arrayOfDependencies)
var deps = DI.inject(fn) // ['foo', 'bar'] 

// returns the parameter names
var deps = DI.params(fn)

// or just specify your own array
var deps = ['foo', 'bar']
di.resolve(deps).spread(function(foo, bar){
	console.log(foo) // foo == 'Hello'
	console.log(bar) // bar == 'World'
})
```

For more information read the docs (./docs/index.html) or look at the tests (./tests)