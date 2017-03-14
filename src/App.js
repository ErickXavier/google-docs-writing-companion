/* global google:false */

import React, { Component } from "react";
import "./App.css";
import { exampleDocument } from "./exampleDocument";

const getDocument = () => {
  return new Promise(function(resolve, reject) {
    if (process.env.NODE_ENV === "production") {
      google.script.run
        .withSuccessHandler(resolve)
        .withFailureHandler(reject)
        .getDocument();
    } else {
      resolve(exampleDocument);
    }
  });
};

const randomSubset = (arr, size) => {
  const shuffled = arr.slice(0);
  var i = arr.length;
  var temp;
  var index;
  while (i--) {
    index = Math.floor((i + 1) * Math.random());
    temp = shuffled[index];
    shuffled[index] = shuffled[i];
    shuffled[i] = temp;
  }
  return shuffled.slice(0, size);
};

const analyze = textElements => {
  const randomTextElements = randomSubset(textElements, 5);
  const randomNonsensicalSuggestions = randomTextElements.map((element, i) => {
    const randomStartIndex = Math.floor(Math.random() * element.text.length);
    const randomEndIndex = Math.min(randomStartIndex + 15, element.text.length);

    return {
      id: i,
      description: "You should delete this part",
      context: element.text,
      startIndex: randomStartIndex,
      endIndex: randomEndIndex,
      element: element,
      replacement: "",
      color: "#ff0000",
    };
  });

  return Promise.resolve({
    suggestions: randomNonsensicalSuggestions,
  });
};

const runAnalysis = () => {
  return getDocument()
    .then(document => {
      console.log(JSON.stringify(document));
      return analyze(document.document);
    })
    .then(analysis => {
      // highlightAnalysis(analysis); // This is a little bit too flaky
      return analysis;
    })
    .catch(error => {
      alert(error);
    });
};

const focusOnElement = elementId => {
  return new Promise(function(resolve, reject) {
    if (process.env.NODE_ENV === "production") {
      google.script.run
        .withSuccessHandler(resolve)
        .withFailureHandler(reject)
        .focusOnElement(elementId);
    } else {
      resolve({ success: true });
    }
  });
};

const highlightAnalysis = analysis => {
  return new Promise(function(resolve, reject) {
    if (process.env.NODE_ENV === "production") {
      const suggestionHighlights = analysis.suggestions.map(suggestion => {
        return {
          elementId: suggestion.element.id,
          startIndex: suggestion.startIndex,
          endIndex: suggestion.endIndex,
          color: suggestion.color,
        };
      });
      google.script.run
        .withSuccessHandler(resolve)
        .withFailureHandler(reject)
        .highlightSuggestions(suggestionHighlights);
    } else {
      resolve({ success: true });
    }
  });
};

const fixFromSuggestion = (elementId, startIndex, endIndex, replacement) => {
  return new Promise(function(resolve, reject) {
    if (process.env.NODE_ENV === "production") {
      google.script.run
        .withSuccessHandler(resolve)
        .withFailureHandler(reject)
        .fixFromSuggestion(elementId, startIndex, endIndex, replacement);
    } else {
      resolve({ success: true });
    }
  });
};

const Suggestion = (handleLinkTo, handleFixIt) => suggestion => {
  return (
    <div className="suggestion" key={suggestion.id}>
      <p className="suggestion__description">{suggestion.description}</p>
      <SuggestionContext suggestion={suggestion} />
      <p className="suggestion__actions">
        <button className="button" onClick={() => handleLinkTo(suggestion.id)}>
          Scroll to
        </button>
        <button
          className="button green"
          onClick={() => handleFixIt(suggestion.id)}
        >
          Fix it!
        </button>
      </p>
    </div>
  );
};

const SuggestionContext = ({ suggestion }) => {
  const before = suggestion.context.slice(0, suggestion.startIndex);
  const core = suggestion.context.slice(
    suggestion.startIndex,
    suggestion.endIndex
  );
  const after = suggestion.context.slice(suggestion.endIndex);

  const highlightStyle = { backgroundColor: suggestion.color };
  return (
    <p className="suggestion__context">
      {before}<span style={highlightStyle}>{core}</span>{after}
    </p>
  );
};

class App extends Component {
  constructor(props) {
    super(props);

    this.state = {
      analysis: null,
    };

    this.handleAnalyzeButtonPress = this.handleAnalyzeButtonPress.bind(this);
    this.handleFixIt = this.handleFixIt.bind(this);
    this.handleLinkTo = this.handleLinkTo.bind(this);
  }

  getSuggestion(suggestionId) {
    return this.state.analysis &&
      this.state.analysis.suggestions.filter(s => s.id === suggestionId)[0];
  }

  handleFixIt(suggestionId) {
    const suggestion = this.getSuggestion(suggestionId);

    fixFromSuggestion(
      suggestion.element.id,
      suggestion.startIndex,
      suggestion.endIndex,
      suggestion.replacement
    ).then(result => {
      this.setState({
        analysis: {
          suggestions: this.state.analysis.suggestions.filter(
            s => s.id !== suggestionId
          ),
        },
      });
    });
  }

  handleLinkTo(suggestionId) {
    const suggestion = this.getSuggestion(suggestionId);

    focusOnElement(suggestion.element.id).then(result => {
      console.log(result);
    });
  }

  handleAnalyzeButtonPress() {
    runAnalysis().then(result => {
      this.setState({ analysis: result });
    });
  }

  componentWillMount() {
    console.log("Will Mount");
  }

  componentWillUnmount() {
    console.log("Will Unmount");
  }

  render() {
    const suggestions = (this.state.analysis &&
      this.state.analysis.suggestions) || [];
    return (
      <div className="sidebar">
        <div>
          <button onClick={this.handleAnalyzeButtonPress}>Analyze</button>
        </div>
        <div id="suggestions">
          {suggestions.map(Suggestion(this.handleLinkTo, this.handleFixIt))}
        </div>

      </div>
    );
  }
}

export default App;
