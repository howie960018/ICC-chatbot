let dialogueState = {
    count: 0,
    history: [],
    technique: '',
    scenario: '',
    recordings: []
  };
  
  let currentDialogueRecordings = [];
  
  function resetDialogueState(technique) {
    dialogueState = {
      count: 0,
      history: [],
      technique,
      scenario: '',
      recordings: []
    };
    currentDialogueRecordings = [];
  }

  function updateDialogueState(updates) {
    dialogueState = {
      ...dialogueState,
      ...updates
    };
  }
  
  function addRecording(recording) {
    currentDialogueRecordings.push(recording);
    dialogueState.recordings.push(recording);
  }
  
  function getDialogueState() {
    return dialogueState;
  }
  
  function getCurrentRecordings() {
    return currentDialogueRecordings;
  }
  
  function resetCurrentRecordings() {
    currentDialogueRecordings = [];
  }
  
  function addToHistory(entry) {
    dialogueState.history.push(entry);
  }
  
  function incrementCount() {
    dialogueState.count++;
  }

  module.exports = {
    resetDialogueState,
    updateDialogueState,
    addRecording,
    addToHistory,
    incrementCount,
    getDialogueState,
    getCurrentRecordings,
    resetCurrentRecordings
  };
  