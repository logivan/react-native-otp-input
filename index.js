import React, { Component } from "react";
import {
  View,
  TextInput,
  TouchableWithoutFeedback,
  Clipboard,
  Keyboard,
  Platform
} from "react-native";
import PropTypes from "prop-types";
import styles from "./styles";
import { isAutoFillSupported } from "./helpers/device";

export default class OTPInputView extends Component {
  static propTypes = {
    pinCount: PropTypes.number,
    codeInputFieldStyle: PropTypes.object,
    codeInputHighlightStyle: PropTypes.object,
    onCodeFilled: PropTypes.func,
    onCodeChanged: PropTypes.func,
    autoFocusOnLoad: PropTypes.bool,
    code: PropTypes.string,
    secureTextEntry: PropTypes.bool
  };

  static defaultProps = {
    pinCount: 6,
    codeInputFieldStyle: null,
    codeInputHighlightStyle: null,
    onCodeFilled: () => null,
    onCodeChanged: () => null,
    autoFocusOnLoad: true,
    secureTextEntry: false
  };

  fields = [];

  constructor(props) {
    super(props);
    const { code } = props;
    this.state = {
      digits: code === undefined ? [] : code.split(""),
      selectedIndex: 0
    };
  }

  UNSAFE_componentWillReceiveProps(nextProps) {
    const { code } = this.props;
    if (nextProps.code !== code) {
      this.setState({
        digits: nextProps.code === undefined ? [] : nextProps.code.split("")
      });
    }
  }

  componentDidMount() {
    this.copyCodeFromClipBoardOnAndroid();
    this.bringUpKeyBoardIfNeeded();
  }

  componentWillUnmount() {
    if (this._timer) {
      clearInterval(this._timer);
    }
  }

  copyCodeFromClipBoardOnAndroid = () => {
    if (Platform.OS === "android") {
      this.checkPinCodeFromClipBoard();
      this._timer = setInterval(() => {
        this.checkPinCodeFromClipBoard();
      }, 400);
    }
  };

  bringUpKeyBoardIfNeeded = () => {
    const { autoFocusOnLoad, pinCount } = this.props;
    const digits = this.getDigits();
    const focusIndex = digits.length ? digits.length - 1 : 0;
    if (focusIndex < pinCount && autoFocusOnLoad) {
      this.focusField(focusIndex);
    }
  };

  getDigits = () => {
    const { digits: innerDigits } = this.state;
    const { code } = this.props;
    return code === undefined ? innerDigits : code.split("");
  };

  notifyCodeChanged = () => {
    const { digits } = this.state;
    const code = digits.join("");
    const { onCodeChanged } = this.props;
    if (onCodeChanged) {
      onCodeChanged(code);
    }
  };

  checkPinCodeFromClipBoard = () => {
    const { pinCount } = this.props;
    Clipboard.getString()
      .then(code => {
        if (
          this.hasCheckedClipBoard &&
          code.length === pinCount &&
          this.clipBoardCode !== code
        ) {
          this.setState(
            {
              digits: code.split("")
            },
            () => {
              this.blurAllFields();
              this.notifyCodeChanged();
            }
          );
        }
        this.clipBoardCode = code;
        this.hasCheckedClipBoard = true;
      })
      .catch(e => {});
  };

  handleChangeText = (index, text) => {
    const { onCodeFilled, pinCount } = this.props;
    const digits = this.getDigits();
    const newDigits = [...digits];

    // Handle not 1 digit
    if (text.length > 1) {
      let mappingIndex = index;

      text.split("").forEach(char => {
        if (mappingIndex <= pinCount - 1) {
          newDigits[mappingIndex] = char;
          mappingIndex += 1;
        }
      });
      mappingIndex -= 1;

      this.setState({ digits: newDigits }, () => {
        this.notifyCodeChanged();
        if (mappingIndex === pinCount - 1) {
          this.blurAllFields();
        }
        this.focusField(mappingIndex);
      });
    } else {
      newDigits[index] = text || "";

      this.setState({ digits: newDigits }, () => {
        this.notifyCodeChanged();

        // Clear digit
        if (!text && index > 0) {
          this.focusField(index - 1);
        }
        // Fill in digit
        if (index < pinCount - 1 && !!text) {
          this.focusField(index + 1);
        }

        // Last index
        if (index === pinCount - 1) {
          const result = newDigits.join("");
          if (result.length === pinCount) {
            this.blurAllFields();
            onCodeFilled(result);
          }
        }
      });
    }
  };

  handleKeyPressTextInput = (index, key) => {
    const digits = this.getDigits();
    if (key === "Backspace") {
      if (!digits[index] && index > 0) {
        this.focusField(index - 1);
      }
    }
  };

  setSelection = index => {
    const { digits } = this.state;
    if (!this.fields[index]) return;

    this.fields[index].setNativeProps({
      selection: digits[index]
        ? { start: 0, end: digits[index].length }
        : { start: 0, end: 0 }
    });
  };

  focusField = index => {
    if (index < this.fields.length) {
      this.fields[index].focus();
      this.setSelection(index);
      this.setState({
        selectedIndex: index
      });
    }
  };

  blurAllFields = () => {
    this.fields.forEach(field => field.blur());
    this.setState({
      selectedIndex: -1
    });
  };

  renderOneInputField = (_, index) => {
    const {
      codeInputFieldStyle,
      codeInputHighlightStyle,
      secureTextEntry
    } = this.props;
    const { defaultTextFieldStyle } = styles;
    const { selectedIndex, digits } = this.state;
    return (
      <View key={index + "view"}>
        <TextInput
          underlineColorAndroid="rgba(0,0,0,0)"
          style={
            selectedIndex === index
              ? [
                  defaultTextFieldStyle,
                  codeInputFieldStyle,
                  codeInputHighlightStyle
                ]
              : [defaultTextFieldStyle, codeInputFieldStyle]
          }
          ref={ref => {
            this.fields[index] = ref;
          }}
          onFocus={() => this.focusField(index)}
          onChangeText={text => {
            this.handleChangeText(index, text);
          }}
          onKeyPress={({ nativeEvent: { key } }) => {
            this.handleKeyPressTextInput(index, key);
          }}
          value={digits[index]}
          keyboardType="number-pad"
          textContentType={isAutoFillSupported ? "oneTimeCode" : "none"}
          key={index}
          selectionColor="#00000000"
          secureTextEntry={secureTextEntry}
        />
      </View>
    );
  };

  renderTextFields = () => {
    const { pinCount } = this.props;
    const array = new Array(pinCount).fill(0);
    return array.map(this.renderOneInputField);
  };

  render() {
    const { pinCount, style } = this.props;
    const digits = this.getDigits();
    return (
      <View style={style}>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            width: "100%",
            height: "100%"
          }}
        >
          {this.renderTextFields()}
        </View>
      </View>
    );
  }
}
