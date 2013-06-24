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

#### Promises 
```javascript
di.register('foo', Q('Hello').delay(1000))
di.call(fn).then(function(result){ // called after foo promise resolves (1 second delay)
	console.log(result)  // result == 'Hello, World!'
})
```

#### Factories
```javascript
// Factories can return promises, factories can even be promises themselves (that resolve to functions)
di.factory('greetingWithDate', function(foo){
	return foo +', it is ' + new Date()
})

di.call(function(greetingWithDate){
	console.log(greetingWithDate) // greetingWithDate = 'Hello, it is Mon Jun 24 2013 12:30:05 GMT-0400 (EDT)
})
```

#### Parent/Child injectors
```javascript
var child = di.create('baz', 'qux')
child.call(function(foo, baz){
	console.log(foo) // foo == 'Hello'
	console.log(baz) // baz == 'qux'
})
```


#### Mongoose/Express Example with Promises/Factories
```javascript
di.factory('user', function(user_id){
	return User.findOne({_id: new ObjectId(user_id)})
})

di.factory('username', function(user){
	return user.username
})

app.get('/user/:user_id/username', function(req, res, next){
	var rdi = di.create(req.params)
	rdi.call(function(username){
		res.send(username)
	}).fail(next) // will call next(err) on failure
})

// Another method
app.get('/user/:user_id/username', function(req, res, next){
	di.create(req.params)
	  .inject(res.send, ['username'])
	  .call(res.send, res)
	  .fail(next)
})

// Without using inject
app.get('/user/:user_id/username', function(req, res, next){
	di.create(req.params)
	  .resolve(['username'])
	  .spread(res.send.bind(res))
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
```

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