// Manual mock for @react-native-community/datetimepicker.
// The real package wraps a native module that is absent in jest. This mock
// renders a simple host element so onChange can be fired via fireEvent in tests.
const React = require('react');
module.exports = (props) => React.createElement('mock-datetimepicker', props);
