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
    // let newdigits = digits.slice();
    // const oldTextLength = newdigits[index] ? newdigits[index].length : 0;
    // const newTextLength = text.length;
    // if (newTextLength - oldTextLength === pinCount) {
    //   // user pasted text in.
    //   newdigits = text.split("").slice(oldTextLength, newTextLength);
    //   this.setState({ digits: newdigits }, this.notifyCodeChanged);
    // } else {
    //   if (text.length === 0) {
    //     if (newdigits.length > 0) {
    //       newdigits = newdigits.slice(0, newdigits.length - 1);
    //     }
    //   } else {
    //     text.split("").forEach(value => {
    //       newdigits[index] = value;
    //       index += 1;
    //     });
    //     index -= 1;
    //   }
    //   this.setState({ digits: newdigits }, this.notifyCodeChanged);
    // }
    // let result = newdigits.join("");
    // if (result.length >= pinCount) {
    //   onCodeFilled && onCodeFilled(result);
    //   this.focusField(pinCount - 1);
    //   this.blurAllFields();
    // } else {
    //   if (text.length > 0 && index < pinCount - 1) {
    //     this.focusField(index + 1);
    //   }
    // }
    const { onCodeFilled, pinCount } = this.props;
    const digits = this.getDigits();

    const digit = text[text.length - 1];

    const newDigits = [...digits];
    newDigits[index] = digit || "";

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
  };

  handleKeyPressTextInput = (index, key) => {
    const digits = this.getDigits();
    if (key === "Backspace") {
      if (!digits[index] && index > 0) {
        this.focusField(index - 1);
      }
    }
  };

  focusField = index => {
    if (index < this.fields.length) {
      this.fields[index].focus();
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
