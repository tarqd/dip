var should = require('should')
	, DI = require('../')
	, Q = require('Q')
	, a
	, b
	, fn

function returnFoo(foo){return foo}

describe('DependencyInjector', function(){
	beforeEach(function(){
		a = new DI()
		b = a.create()
		fn = function(a,b){ return [a,b] }
	})

	describe('.params()', function(){
		it('should return the parameter names of a function', function(){
			var params = DI.params(fn)
			params.should.have.lengthOf(2)
			params.should.include('a')
			params.should.include('b')
		})
	})

	describe('.inject()', function(){
		it('should set the dependencies via $inject', function(){
			a.inject(fn, ['a', 'b'])
			fn.should.have.property('$inject').with.lengthOf(2)
			fn.$inject.should.include('a')
			fn.$inject.should.include('b')
		})
		it('should return the dependencies when one argument is specified', function(){
			a.inject(fn, ['foo', 'bar'])
			var deps = a.inject(fn)
			deps.should.have.lengthOf(2)
			deps.should.include('foo')
			deps.should.include('bar')
		})
	})

	describe('#register', function(){
		it('should register a dependency', function(){
			a.register('foo', 'bar')
			a.registry.should.have.property('foo').and.eql('bar')
		})
		it('should allow objects to be passed', function(){
			a.register({foo: 'bar'})
			a.registry.should.have.property('foo').and.eql('bar')
		})
		it('should allow `DependencyInjectors` to be passed', function(){
			b.register('foo', 'bar')
			a.register(b)
			a.registry.should.have.property('foo').and.eql('bar')
		})
	})

	describe('#factory', function(){
		it('should register a factory', function(){
			a.factory('foo', fn)
			a.factories.should.have.property('foo').and.eql(fn)
		})
		it('should allow objects to be passed', function(){
			a.factory({foo: fn})
			a.factories.should.have.property('foo').and.eql(fn)
		})
		it('should allow `DependencyInjectors` to be passed', function(){
			b.factory('foo', fn)
			a.factory(b)
			a.factories.should.have.property('foo').and.eql(fn)
		})
	})

	describe('#resolve()', function(){
		it('should resolve dependencies', function(next){
			a.register('foo', 'bar')
			a.resolve(['foo']).spread(function(foo){
				should.exist(foo)
				foo.should.eql('bar')
				next()
			}).done()
		})
		it('should resolve dependencies with promises', function(next){
			a.register('foo', Q('bar'))
			a.resolve(['foo']).spread(function(foo){
				should.exist(foo)
				foo.should.eql('bar')
				next()
			}).done()
		})
		it('should call and resolve factories', function(next){
			a.register('bar', 'baz')
			a.factory('foo', function(bar){
				return bar + '!'
			})
			a.resolve(['foo']).spread(function(foo){
				should.exist(foo)
				foo.should.eql('baz!')
				next()
			}).done()
		})

		it('should call and resolve factories with promises', function(next){
			a.register('bar', 'baz')
			a.factory('foo', Q(function(bar){
				return bar + '!'
			}))
			a.resolve(['foo']).spread(function(foo){
				should.exist(foo)
				foo.should.eql('baz!')
				next()
			}).done()
		})

		it('should resolve parent dependencies', function(next){
			a.register('foo', 'bar')
			b.resolve(['foo']).spread(function(foo){
				should.exist(foo)
				foo.should.eql('bar')
				next()
			}).done()
		})
		it('should call and resolve parent factories', function(next){
			a.register('bar', 'baz')
			a.factory('foo', Q(function(bar){
				return bar + '!'
			}))
			b.resolve(['foo']).spread(function(foo){
				should.exist(foo)
				foo.should.eql('baz!')
				next()
			}).done()
		})
		it('should give calling container precedence when resolving factory dependencies', function(next){
			a.register('bar', 'baz')
			a.factory('foo', Q(function(bar){
				return bar + '!'
			}))
			b.register('bar', 'qux')
			b.resolve(['foo']).spread(function(foo){
				should.exist(foo)
				foo.should.eql('qux!')
				next()
			}).done()
		})
	})

	describe('#resolver()', function(){
		it('should return a promise for a function', function(next){
			a.register('foo', 'bar')
			 .resolver(returnFoo).then(function(fn){
			 	should.exist(fn)
			 	fn.should.be.a('function')
			 	fn().should.eql('bar')
			 	next()
			 }).done()
		})
	})

	describe('#resolved()', function(){
		it('should return a function that returns a promise for the return value', function(next){
			var fn = a.register('foo', 'bar').resolved(returnFoo)
			should.exist(fn)
			fn.should.be.a('function')
			fn().then(function(foo){
				should.exist(foo)
				foo.should.eql('bar')
				next()
			}).done()
		})

		it('should not re-resolve dependencies on each call',function(next){
			var fn = a.register('foo', 'bar').resolved(returnFoo)
			should.exist(fn)
			fn.should.be.a('function')
			fn().then(function(foo){
				should.exist(foo)
				foo.should.eql('bar')
			}).then(function(){
				a.register('foo', 'baz')
				return fn()
			}).then(function(foo){
				should.exist(foo)
				foo.should.eql('bar')
				next()
			}).done()
		})
	})

	describe('#bind()', function(){
		it('should return a function that returns a promise for the return value', function(next){
			var fn = a.register('foo', 'bar').bind(returnFoo)
			should.exist(fn)
			fn.should.be.a('function')
			fn().then(function(foo){
				should.exist(foo)
				foo.should.eql('bar')
				next()
			}).done()
		})
		it('should re-resolve dependencies on each call',function(next){
			var fn = a.register('foo', 'bar').bind(returnFoo)
			should.exist(fn)
			fn.should.be.a('function')
			fn().then(function(foo){
				should.exist(foo)
				foo.should.eql('bar')
			}).then(function(){
				a.register('foo', 'baz')
				return fn()
			}).then(function(foo){
				should.exist(foo)
				foo.should.eql('baz')
				next()
			}).done()
		})
	})

	describe('#call', function(){
		it('should resolve dependencies and return a promise for the return value', function(next){
			a.register('foo', 'bar').call(returnFoo).then(function(foo){
				should.exist(foo)
				foo.should.eql('bar')
				next()
			}).done()
		})

		it('should allow specifying context', function(next){
			var context = {}
			function fn(){
				this.should.equal(context)
				next()
			}
			a.register('foo', 'bar')
			 .call(fn, context)
			 .done()
		})
		it('should allow extra arguments if dependencies are manually specified', function(next){
			a.register('foo', 'bar')
			 .inject(fn, ['foo'])
			 .call(fn, null, 'baz')
			 .then(function(args){
			 		should.exist(args)
			 		args.should.have.lengthOf(2)
			 		args.should.include('bar')
			 		args.should.include('baz')
			 		next()
			 }).done()
		})
	})

	describe('#create()', function(){
		it('should set the parent of the child injector', function(){
			should.exist(b.parent)
			b.parent.should.equal(a)
		})
	})

})