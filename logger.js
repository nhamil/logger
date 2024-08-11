const VERSION = 2; 
let formTitle = "Untitled Form"; 
let formVersion = ""; 
const items = document.getElementById('items'); 
const entryGetters = {}; 
const entrySetters = {}; 

function clearItems() {
    items.textContent = ''; 
    for (const key in entryGetters) {
        delete entryGetters[key]; 
    }
    for (const key in entrySetters) {
        delete entrySetters[key]; 
    }
}

function clearUserData() {
    if (confirm("Are you sure you want to clear all form input?")) {
        localStorage.removeItem('current'); 
        rebuildForm(); 
    }
}

function clearData() {
    if (confirm("Are you sure you want to reset the form configuration?")) {
        clearItems(); 
        localStorage.removeItem('data'); 
        rebuildForm(); 
    }
}

function addTitle(label, version) {
    const title = document.createElement('h1'); 
    formTitle = label; 
    formVersion = version; 
    title.classList.add('form-title'); 
    title.textContent = label; 
    if (version) {
        title.textContent += " " + version; 
    }
    items.appendChild(title); 
}

function stringifyFormData() 
{
    const out = {}; 

    for (const key in entryGetters) {
        out[key] = entryGetters[key](); 
    }

    const json = JSON.stringify({
        "version": VERSION, 
        "form": formTitle, 
        "formVersion": formVersion, 
        "data": out
    }, null, 2); 

    return json; 
}

function addSubmit() {
    const button = document.createElement('button'); 
    button.textContent = "Submit"; 
    button.addEventListener('click', function() {
        const json = stringifyFormData(); 

        const elem = document.getElementById('download-form'); 
        elem.setAttribute('href', URL.createObjectURL(
            new Blob([json]), 
            {
                type: 'application/json'
            }
        )); 
        elem.setAttribute('download', formTitle.replace(/[/\\?%*:|"<>]/g, '-') + ' ' + new Date().toISOString().replace(/[\-:]/g, '-').replace('T', '_').split('.')[0] + ".json"); 
        elem.click(); 
    });

    items.appendChild(button); 
}

function getAndAddGroup() {
    const elem = document.createElement('div'); 
    elem.classList.add('item'); 
    items.appendChild(elem); 

    return elem; 
}

function createLabel(label, icon) {
    const div = document.createElement('div'); 
    div.classList.add('item-top'); 

    if (icon) {
        const iconElem = document.createElement('label'); 
        iconElem.classList.add('item-icon'); 
        iconElem.textContent = icon; 
        div.appendChild(iconElem); 
    }

    const title = document.createElement('label'); 
    title.classList.add('item-label'); 
    title.textContent = label; 
    div.appendChild(title); 

    return [div, title]; 
}

const addInputTypes = {
    text: function() {
        const input = document.createElement('input'); 
        input.type = 'text'; 
        input.autocomplete = 'off'; 
        input.autocapitalize = 'sentences'; 
        return [input, () => input.value, value => input.value = value];   
    }, 
    number: function() {
        const input = document.createElement('input'); 
        input.type = 'number'; 
        input.autocomplete = 'off'; 
        return [input, () => parseFloat(input.value), value => input.value = value];   
    }, 
    date: function() {
        const input = document.createElement('input'); 
        input.type = 'date'; 
        input.autocomplete = 'off'; 
        return [input, () => input.value, value => input.value = value];   
    }, 
    time: function() {
        const input = document.createElement('input'); 
        input.type = 'time'; 
        input.autocomplete = 'off'; 
        return [input, () => input.value, value => input.value = value];   
    }, 
    list: function() {
        const div = document.createElement('div'); 
        div.classList.add('multiitem'); 
        const inputs = []; 

        function createLine(parent) {
            const input = document.createElement('input'); 
            input.type = 'text'; 
            input.autocomplete = 'off'; 
            input.autocapitalize = 'sentences'; 

            input.addEventListener('keypress', function(event) {
                if (event.key === 'Enter') return; 

                if (inputs[inputs.length - 1] === input) {
                    createLine(); 
                }
            }); 
            input.addEventListener('input', function(event) {
                if (inputs[inputs.length - 1] === input) {
                    createLine(); 
                }
            }); 
            input.addEventListener('paste', function(event) {
                let cur = input; 
                for (const line of event.clipboardData.getData('text').split('\n')) {
                    cur.value += line; 
                    cur = createLine(cur); 
                    cur.focus(); 
                }
                event.preventDefault(); 
            }); 
            input.addEventListener('focusout', function() {
                if (inputs[inputs.length - 1] !== input && input.value == "") {
                    inputs.splice(inputs.indexOf(input), 1); 
                    div.removeChild(input); 
                }
            }); 

            inputs.push(input); 
            if (parent) {
                div.insertBefore(input, parent.nextSibling); 
            } 
            else {
                div.appendChild(input); 
            }

            return input; 
        }

        createLine(); 

        return [
            div, 
            () => inputs.filter(e => e.value != "").map(e => e.value), 
            values => {
                for (let value of values) {
                    const lastLine = inputs[inputs.length - 1]; 
                    lastLine.value = value; 
                    createLine(lastLine); 
                }
            }
        ];   
    }, 
    paragraph: function(data) {
        const input = document.createElement('textarea'); 
        input.type = 'text'; 
        input.rows = data.rows || 6; 
        input.autocapitalize = 'sentences'; 
        input.autocomplete = 'off'; 
        return [
            input, 
            () => input.value.replace('\r', '').split('\n'), 
            value => {
                input.value = (value || []).join('\n'); 
                input.scrollTop = input.scrollHeight; 
            }
        ];   
    }, 
    range: function(data, label, labelElem) {
        const input = document.createElement('input'); 
        input.type = 'range'; 
        
        let valueSet = false; 

        const range = data.range;// || [0, 10]; 
        input.min = range[0]; 
        input.max = range[1]; 
        input.value = input.min; 

        function update() {
            valueSet = true; 
            labelElem.textContent = label + ": " + input.value
        }

        input.addEventListener('input', update);
        input.addEventListener('mousedown', update);

        update(); 

        return [
            input, 
            () => valueSet ? parseFloat(input.value) : null, 
            value => {
                if (value != null) {
                    input.value = value; 
                    update(); 
                }
            }
        ];  
    }, 
    checkbox: function(data) {
        const inputs = []; 
        const values = []; 

        for (const value of data.values) {
            const div = document.createElement('div'); 
            const input = document.createElement('input'); 
            const text = document.createElement('label'); 
            input.type = 'checkbox'; 
            input.id = 'checkbox-' + Math.floor(Math.random() * 1000000); 
            text.textContent = value; 
            text.htmlFor = input.id; 

            values.push([value, () => input.checked == true])

            div.appendChild(input); 
            div.appendChild(text); 
            inputs.push(div); 
        }

        return [
            inputs, 
            () => {
                const out = []; 
                values.forEach(([valueLabel, valueFn]) => {
                    if (valueFn()) out.push(valueLabel); 
                });
                return out; 
            }, 
            values => {
                for (let value of values) {
                    for (let checkboxIndex in data.values) {
                        if (value == data.values[checkboxIndex]) {
                            inputs[checkboxIndex].children[0].checked = true; 
                        }
                    }
                }
            }
        ]; 
    }
};

function rebuildFromConfig(config) {
    clearItems(); 
    addTitle(config.title, config.version); 

    const badItems = []; 

    let lastGroup = null; 

    for (const label in config.items) {
        const data = config.items[label]; 
        if (data.disabled) continue; 

        const groupElem = data.append ? lastGroup : getAndAddGroup(); 
        lastGroup = groupElem; 
        let added = false; 

        const type = data.type; 
        
        if (addInputTypes[type]) {
            if (!data.append) {
                if (added) {
                    const space = document.createElement('div'); 
                    space.classList.add('spacing'); 
                    groupElem.appendChild(space); 
                }
                added = true; 
            }

            const [titleElem, labelElem] = createLabel(label, data.icon); 
            if (!data.append) groupElem.appendChild(titleElem); 

            const [inputs, getter, setter] = addInputTypes[type](data, label, labelElem); 

            if (Array.isArray(inputs)) {
                for (const input of inputs) {
                    groupElem.appendChild(input); 
                }
            }
            else {
                groupElem.appendChild(inputs); 
            }

            entryGetters[label] = getter; 
            entrySetters[label] = setter; 
        }
        else {
            badItems.push(type); 
        }
    }

    addSubmit(); 

    if (badItems.length) {
        alert("The following items are not supported: " + JSON.stringify(badItems)); 
    }
}

function fillOutForm(data) {
    if (!data) return; 

    if (data['form'] != formTitle || data['formVersion'] != formVersion) {
        console.log("Current user data does not match the form config: " + data['form'] + " vs " + formTitle + ", " + data['formVersion'] + " vs " + formVersion); 
        return; 
    }

    for (let item in data['data']) 
    {
        entrySetters[item](data['data'][item]); 
    }
}

function rebuildForm() {
    try {
        rebuildFromConfig(JSON.parse(localStorage.getItem('data'))); 
    }
    catch (e) {
        loadDefault(); 
    }

    try {
        fillOutForm(JSON.parse(localStorage.getItem('current'))); 
    }
    catch (e) {
        console.log("Could not fill out form data: " + e); 
    } 
}

document.addEventListener('keypress', function(event) {
    if (event.key === "Enter" && event.target.tagName.toLowerCase() === "input") {
        let found = false; 
        for (const elem of document.querySelectorAll('input,textarea,button')) {
            if (elem == event.target) {
                found = true; 
            }
            else if (found) {
                elem.focus(); 
                break; 
            }
        }
    }
}, true);

document.addEventListener('input', function(event) {
    localStorage.setItem('current', stringifyFormData()); 
});

document.getElementById('load-config').addEventListener('change', function() {
    /** @type {FileList} */
    const files = this.files; 

    if (files.length === 0) {
        alert("No file selected"); 
        return; 
    }

    if (files.length !== 1) {
        alert("Unsupported number of config files: " + files.length); 
        return; 
    }

    const file = files.item(0); 
    if (!file) {
        alert("Could not load file"); 
        return; 
    }

    const reader = new FileReader(); 
    reader.onload = function() {
        const json = JSON.parse(reader.result); 
        localStorage.setItem('data', JSON.stringify(json)); 
        rebuildFromConfig(json); 
    }; 
    reader.readAsText(file); 
});

rebuildForm(); 

function loadDefault() {
    rebuildFromConfig({
        "title": "Basic Log", 
        "version": "v1", 
        "items": {
            "Date": {
                "type": "date", 
                "icon": "🗓️"
            },
            "Wake Time": {
                "type": "time", 
                "icon": "⏰"
            },
            "Sleep Time": {
                "type": "time", 
                "icon": "💤"
            },
            "Weight (lb)": {
                "type": "number", 
                "icon": "⚖️"
            },
            "Mood (0-10)": {
                "type": "range", 
                "icon": "🙂", 
                "range": [0, 10] 
            },
            "Exercise": {
                "type": "list", 
                "icon": "🏋️"
            },
            "Activities": {
                "type": "checkbox", 
                "icon": "🔨", 
                "values": [
                    "Clean", 
                    "Groceries", 
                    "Hobbies", 
                    "Work"
                ]
            }, 
            "Activities (Other)": {
                "type": "list", 
                "append": true
            }, 
            "Breakfast": {
                "type": "list", 
                "icon": "🥞"
            }, 
            "Lunch": {
                "type": "list", 
                "icon": "🥪"
            }, 
            "Dinner": {
                "type": "list", 
                "icon": "🍝"
            }, 
            "Snacks": {
                "type": "list", 
                "icon": "🍪"
            },
            "Something Bad": {
                "type": "text", 
                "icon": "👎"
            }, 
            "Something Good": {
                "type": "text", 
                "icon": "👍"
            }, 
            "Summary": {
                "type": "paragraph", 
                "icon": "📓"
            }
        }
    }); 
}
