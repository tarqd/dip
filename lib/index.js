/*!
 * Module dependencies
 */

var Q 		= require('q')
	, slice = require('sliced')
	, params = require('get-parameter-names')
	, defer = Q.defer

/**
 * DependencyInjector
 *
 * ####Example:
 * ```javascript
 * var di = new DependencyInjector({'foo': 'bar'})
 * di.call(function(foo){
 *    console.log('foo') // foo == 'bar'
 * })
 * ```
 * @param {Object|DepedencyInjector} registry   name/value pairs of dependencies or a DI injector to inherit
 * @param {Object} factories name/value pairs of factories, only used when registry is not a `DependencyInjector`
 * @param {DependencyInjector} parent `DependencyInjector` used when this injector can not resolve a reference. 
 * @constructor
 * 
 */
function DependencyInjector(registry, factories, parent){
	if(factories instanceof DepedencyInjector && parent === undefined){
		parent = factories
		factories = undefined
	}
	if (registry instanceof DependencyInjector) {
		if (parent) {
			if (registry.deps) 			this.register(registry.registry)
			if (registry.factories) this.factory(registry.factories)
			this.parent = parent
		} else {
			this.parent = registry
		}
	} else {
		this.registry = registry 	
		this.factories = factories
		this.parent = parent
	}
}


/**
 * Registers dependencies to the injector
 * @param  {String} name  
 * @param  {Promise|DependencyInjector|Mixed} value 
 * @return {DependencyInjector} self for chaining
 */
DependencyInjector.prototype.register = function(name, value){
	if (!this.registry) this.registry = {}
	if(typeof name === 'string'){
		this.registry[name] = value
	} else if (name instanceof DependencyInjector) {
		return this.register(name.registry)
	} else {
		for (var x in name) {
			if(name.hasOwnproperty(x)){
				this.registry[x] = name[x]
			}
		}
	}
	return this
}

/**
 * Unregisters a function from the injector
 * @param  {String} name 
 * @return {DependencyInjector}  self for chaining
 */
DependencyInjector.prototype.unregister = function(name){
	if(this.registry) delete this.registry[name]
	return this
}

/**
 * Registers a factory dependency, this is called in the context of the injector at runtime
 * Factories **must** be a function! You may however return a promise and it will be resolved before being passed to the target function
 * You should take care to make sure that there are no circular dependencies as they will cause a infinite loop
 * @param  {String|Object}   name 
 * @param  {Function} fn   
 * @return {DependencyInjector}  self for chaining
 */
DependencyInjector.prototype.registerFactory = function(name, fn){
	if (!this.factories) this.factories = {}
	if(typeof name === 'string'){
		this.factories[name] = fn
	} else if (name instanceof DependencyInjector) {
		return this.register(name.factories)
	} else {
		for (var x in name) {
			if(name.hasOwnproperty(x)){
				this.factories[x] = name[x]
			}
		}
	}
	return this
}

/**
 * Alias for `DependencyInjector#registerFactory
 * @function
 */
DependencyInjector.prototype.factory = DependencyInjector.prototype.registerFactory


/**
 * Removes a factory from the injector
 * @param  {String} name 
 * @return {DependencyInjector} self for chaining
 */
DependencyInjector.prototype.unregisterFactory = function(name){
	if(this.factories) delete this.factories[name]
	return this
}


/**
 * Creates a child dependency injector
 *
 * ####Example:
 * ```javascript
 * var parent = new DependencyInjector({'foo': 'bar'})
 * var child 	= parent.create({'baz': 'qux'})
 * ```
 * Is the same as doing this
 * ```javascript
 * var parent = new DepedencyInjector({'foo': 'bar'})
 * var child = new DepedencyInjector({'baz': 'qux'}, parent)
 * ```
 * 
 * @param  {Object} registry name/value pairs of dependencies
 * @param  {Object} factories name/value pairs of factories
 * @return {DependencyInjector}
 */
DependencyInjector.prototype.create = function(registry, factories){
	return new DependencyInjector(registry, factories, this)
}

/**
 * Calls a function with injected dependencies
 * @param  {Function} fn 
 * @param  {Object} context
 * @param  {Mixed}	arguments...	
 * @return {Mixed}	promise for result of call      
 */
DependencyInjector.prototype.call = function(fn, context){
	return this.apply(fn, context, slice(arguments, 2))
}



/**
 * Calls a function with injected dependencies, takes an array of arguments
 * @param  {Function} fn
 * @param  {Object} context 
 * @param  {Mixed}	arguments...	
 * @return {Mixed}	promise for result of call      
 */
DependencyInjector.prototype.apply = function(fn, context, args){
	var deps 	= resolveFunction(this, fn)
		,	fn 		= context ? fn.bind(context) : fn

	if(args.length === 0) return deps.spread(fn)
	else return deps.then(mergeArgs(args)).spread(fn)
}

/**
 * Calls a method on an object with injected dependencies
 * @param  {String} method
 * @param  {Mixed}	arguments...	
 * @return {Mixed}	promise for result of call      
 */
DependencyInjector.prototype.mcall = function(obj, method){
	return this.mapply(obj, method, slice(arguments, 2))
}
//aliases
DependencyInjector.prototype.methodCall = 
DependencyInjector.prototype.mcall

/**
 * Calls a method on an object with injected dependencies
 * @param  {String} method
 * @param  {Mixed}	arguments...	
 * @return {Mixed}	promise for result of call      
 */
DependencyInjector.prototype.mapply = function(obj, method, args){
	var deps 	= resolveFunction(this, fn)
		, fn 		= mapply(obj, method)

	if(args.length === 0) return deps.then(fn)
	else return deps.then(mergeArgs(args)).then(fn)
}
// aliases
DependencyInjector.prototype.methodApply =
DependencyInjector.prototype.mapply

/**
 * Returns a new function that calls `fn` with it's dependencies injected
 * The returned function returns a promise for the result of the function call
 * 

 * @param  {Object}   context 
 * @param  {Function} fn      
 * @param  {Mixed}	arguments...
 * @return {Function}   
 */
DependencyInjector.prototype.bind = function(fn, context){
	return this.abind(fn, context, slice(arguments, 2))
}

/**
 * Returns a new function that calls `fn` with it's dependencies injected
 * The returned function returns a promise for the result of the function call
 * 
* @param  {Function} fn    
 * @param  {Object}   context 
 * @param  {Array<Mixed>}   args  
 * @return {Function}
 */
DependencyInjector.prototype.abind = function(fn, context, args){
	var self = this

	return function dfBound(){
		if (arguments.length > 0) {
			return self.apply(fn, context, slice(arguments, 0).concat(args))
		} else {
			return self.apply(fn, context, args)
		}
	}
}
// aliases
DependencyInjector.prototype.applyBind =
DependencyInjector.prototype.abind

/**
 * Returns a new function that will call an objects method with resolved dependencies
 * The returned function returns a promise for the result of the function call
 * @param  {Object} obj    
 * @param  {Function} method 
 * @param  {Mixed}	arguments...
 * @return {Function}        
 */
DependencyInjector.prototype.mbind = function(obj, method){
	return this.ambind(obj, method, slice(arguments, 2))
}
//aliases
DependencyInjector.prototype.methodBind =
DependencyInjector.prototype.mbind

/**
 * Returns a new function that will call an objects method with resolved dependencies
 * The returned function returns a promise for the result of the function call
 * 
 * @param  {Object}   
 * @param  {Function} method
 * @param  {Array<Mixed>} args  
 * @return {Function}
 */
DependencyInjector.prototype.ambind = function(obj, method, args){
	var self = this

	return function dfBound(){
		if (arguments.length > 0) {
			return self.mapply(obj, method, slice(arguments, 0).concat(args))
		} else {
			return self.mapply(obj, method, args)
		}
	}
}
// aliases
DependencyInjector.prototype.applyMethodBind =
DependencyInjector.prototype.ambind

/**
 * Returns resolved vesion of a function. Dependencies will not be re-resolved on subsequent calls. Resolved function returns a promise for the return of `fn`
 * @param  {Function} fn 
 * @param  {Object} context
 * @oaram  {Arrat<Mixed>} args
 * @return {Function} 
 */
DependencyInjector.prototype.aresolved = function(fn, context, args) {
	var deps = resolveFunction(this, fn)
	if(args && !Array.isArray(args)) throw new Error('The `args` parameters must be an array')

	return function resolvedFunction(){
		var additionalArgs = mergeArgsArray(arguments, args)
			, resolver = additionalArgs 
										? deps.then(mergeArgs(additionalArgs))
										: deps

		return resolver.then(function(args){
			return fn.apply(context, args)
		})
	}
}
// aliases
DependencyInjector.prototype.applyResolved =
DependencyInjector.prototype.aresolved

/**
 * Returns resolved vesion of a function. Dependencies will not be re-resolved on subsequent calls. Resolved function returns a promise for the return of `fn`
 * @param  {Function} fn 
 * @param  {Object} context
 * @oaram  {Mixed} arguments...
 * @return {Function} 
 */
DependencyInjector.prototype.resolved = function(fn, context) {
	var args = slice(arguments, 2)
	return this.aresolved(fn, context, args)
}



/**
 * Resolves dependencies with their registered values
 * @param  {Array|String} dependencies to resolve
 * @return {Promise}      promise for the resolved dependencies
 */
DependencyInjector.prototype.resolve = function(deps) {
	var registry 	= this.registry
		, factories = this.factories
		, parent 		= this.parent
		, deps 			= Array.isArray(deps) ? deps : [deps]
		, self 			= this

	// If we have no registered dependencies and no parent return array of undefined
	if(!registry && !this.parent) return new Array(deps.length)

	// Resolves the dependencies
	return Q.all(deps.map(function(name){
		if (registry && registry[name] !== undefined) return registry[name]
		else if(factories && factories[name]){
			return self.call(factories[name])
		}
		else if(parent && parent.registry) return parent.resolve(name)
		else return undefined
	}))
}

/**
 * Gets or sets the dependencies of a function
 * @function
 * @param {Function} fn
 * @param {Array<String>} dependencies
 * @return {Array<String>} dependencies
 */
DependencyInjector.prototype.inject = inject

/**
 * Gets or sets the dependencies of a function
 * @alias DepencyInjector.prototype.inject
 * @param {Function} fn
 * @param {Array<String>} dependencies
 * @return {Array<String>} dependencies
 */
function inject (fn, names){
	if (names !== undefined) {
		fn.$inject = names
		return this
	} else if (fn && fn.$inject) {
		return fn.$inject
	} else {
		return fn.$inject = params(fn)
	}
}

/**
 * Gets the parameter names for a function
 * @type {Function}
 * @function
 * @param {Function} fn
 * @return {Array<String>} param names
 */
DependencyInjector.prototype.params = params

/*!
 *  @ignore
 */
function mergeArgs(additionalArgs){
	return function(args){
		if(additionalArgs && additionalArgs.length > 0)
			return args.concat(additionalArgs)
		else return args
	}
}

function mergeArgsArray(fargs, args){
	var additionalArgs = fargs.length > 0 && slice(fargs,0)
	if(args && args.length > 0)
		additionalArgs = additionalArgs ? args.concat(additionalArgs) : args
	return additionalArgs
}

function resolveFunction(self, fn){
	if(Q.isPromise(fn)){
		return fn.then(inject).then(function(deps){
			return self.resolve(deps)
		})
	} else {
		return self.resolve(inject(fn))
	}
}

function test(foo, lol){
	console.log('foo is ', foo)
	console.log('lol is ', lol)
	return foo + ' baz'
}
var di = new DependencyInjector()
di.register('foo', Q('bar').delay(400))
di.register('laughter', Q('hahahah').delay(500))
di.factory('lol', function(foo, laughter){
	return foo + " + " +laughter
})
//di.inject(test, ['foo', 'lol'])
var fn = di.bind(test)
fn().then(function(result){
	console.log('result is ', result)
})

