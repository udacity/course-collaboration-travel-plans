var TravelPlansApp = (function() {
  // Private variables
  var somePrivateVariable = "private";

  // Private methods
  function somePrivateMethod() {
    console.log("I'm a private method");
  }

  return {
    // Public variables
    somePublicVariable: "public",
    someExposedPrivateVariable: somePrivateVariable,

    // Public methods
    somePublicMethod: function() {
      console.log("I'm a public method.");
    },

    someExposedPrivateMethod: function() {
      console.log("I'm going to expose a private method:");
      somePrivateMethod();
    }
  };
}());
