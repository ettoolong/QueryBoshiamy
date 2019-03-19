let defaultPreference = {
  enableContextMenu: true,
  version: 2
};
let preferences = {};
let menuId = null;
let _token = '';
let _result = {};

const storageChangeHandler = (changes, area) => {
  if(area === 'local') {
    let changedItems = Object.keys(changes);
    for (let item of changedItems) {
      preferences[item] = changes[item].newValue;
    }
    resetContextMenu();
  }
};

const loadPreference = () => {
  browser.storage.local.get().then(results => {
    if ((typeof results.length === 'number') && (results.length > 0)) {
    results = results[0];
    }
    if (!results.version) {
      preferences = defaultPreference;
      browser.storage.local.set(defaultPreference).then(res => {
        browser.storage.onChanged.addListener(storageChangeHandler);
      }, err => {
      });
    } else {
      preferences = results;
      browser.storage.onChanged.addListener(storageChangeHandler);
    }
    browser.storage.local.set({cacheText: ''});
    if (preferences.version !== defaultPreference.version) {
      let update = {};
      let needUpdate = false;
      for(let p in defaultPreference) {
        if(preferences[p] === undefined) {
          update[p] = defaultPreference[p];
          needUpdate = true;
        }
      }
      if(needUpdate) {
        update.version = defaultPreference.version;
        browser.storage.local.set(update).then(null, err => {});
      }
    }
    resetContextMenu();
  });
};

window.addEventListener('DOMContentLoaded', event => {
  loadPreference();
});

function getParamsFromUrl(url) {
  url = decodeURI(url);
  if (typeof url === 'string') {
    let params = url.split('?');
    let eachParamsArr = params[1].split('&');
    let obj = {};
    if (eachParamsArr && eachParamsArr.length) {
      eachParamsArr.map(param => {
        let keyValuePair = param.split('=')
        let key = keyValuePair[0];
        let value = keyValuePair[1];
        obj[key] = value;
      })
    }
    return obj;
  }
}

function redirect(requestDetails) {
  let params = getParamsFromUrl(requestDetails.url)
  execQuery(params.q, 'table');
  return {cancel: true};
}

browser.webRequest.onBeforeRequest.addListener(
  redirect,
  {urls: ['https://boshiamy.com/webextension/*']},
  ['blocking']
);

const execQuery = (text, dataType) => {
  getToken(token => {
    liuquery(text, token, dataType, data => {
      if(dataType === 'table') {
        chrome.tabs.create({url:'./queryResult.html'}, tab => {
          _result[tab.id] = data;
        });
      }
      else {
        chrome.tabs.sendMessage(tab.id, {action:'showAlert', data: data});
      }
    });
  });
}

const resetContextMenu = () => {
  browser.contextMenus.removeAll(() => {
    menuId = null;
    createContextMenu();
  });
};

const createContextMenu = () => {
  if(preferences.enableContextMenu) {
    menuId = browser.contextMenus.create({
      type: 'normal',
      title: browser.i18n.getMessage('queryBoshiamy'),
      contexts: ['selection'],
      onclick: (data, tab) => {
        let text = data.selectionText;
        execQuery(text, 'table');
      }
    });
  }
};

const liuquery = (c, token, dataType, cb) => {
  let req = new XMLHttpRequest();
  req.onload = function(e) {
    let result = [];
    let text = req.responseText;
    text = text.replace(/\r\n/g,'\n').replace(/\n/g,'');
    let table = text.match(/<table.*<\/table>/ig);
    if(table) {
      if(dataType === 'array') {
        let parser = new DOMParser();
        let doc = parser.parseFromString(table[0], 'text/html');
        let characters = (doc.querySelectorAll('tr'));
        for(let c of characters) {
          let s = c.firstChild.textContent;
          let elems = (c.querySelectorAll('span.rootmean'));
          for(let e of elems) {
            if(e.textContent === '(建議碼)') {
              s+='('+e.parentNode.firstChild.textContent+')';
              result.push(s);
              break;
            }
          }
        }
        cb(result);
      }
      else if(dataType === 'table') {
        cb(table);
      }
    }
  }
  req.onerror = function(e) {
  }
  req.open('POST', 'https://boshiamy.com/liuquery.php');
  req.setRequestHeader('Accept', 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8');
  req.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
  req.setRequestHeader('Upgrade-Insecure-Requests', '1');
  req.send('f=1&q='+c+'&token='+token);
};

const getToken = (cb) => {
  if(!_token) {
    let req = new XMLHttpRequest();
    req.onload = function(e) {
      //console.log(req.responseText);
      let text = req.responseText;
      text = text.replace(/\r\n/g,'\n').replace(/\n/g,'');
      let form = text.match(/<form.*<\/form>/ig);
      if(form) {
        let parser = new DOMParser();
        let doc = parser.parseFromString(form[0], 'text/html');
        let tokenElem = (doc.querySelector('input[type="hidden"][name="token"]'));
        let token = tokenElem.getAttribute('value');
        _token = token;
        cb(token);
      }
    }
    req.onerror = function(e) {
    }
    req.open('GET', 'https://boshiamy.com/liuquery.php');
    // req.setRequestHeader('Content-Type', 'application/json');
    // req.send(JSON.stringify({longUrl: long_url}));
    req.send();
  }
  else {
    cb(_token);
  }
};

browser.runtime.onMessage.addListener( (request, sender, sendResponse) => {
  sendResponse(_result[sender.tab.id]);
  if(_result[sender.tab.id])
    delete _result[sender.tab.id];
});
