browser.runtime.onMessage.addListener( message => {
  if(message.action === 'showAlert') {
    alert(message.data.join(', '));
  }
  else if(message.action === 'getSelectionText') {
    let text = window.getSelection().toString();
    text = text.replace(/^\s+|\s+$/g,'').replace(/\r\n/g,'\n').replace(/\n/g,'');
    if(text) {
      return Promise.resolve({text: text});
    }
    else {
      text = prompt(browser.i18n.getMessage('inputQueryCharacters'), '');
      return Promise.resolve({text: text});
    }
  }
});
