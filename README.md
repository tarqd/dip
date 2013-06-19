#promised
==========


```javascript
var di = new DependencyInjector({'foo': 'bar'})
 di.call(null, function(foo){
     console.log('foo') // foo == 'bar'
})
```