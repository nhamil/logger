const VERSION = "0.0.1"; 
let formTitle = "Untitled Form"; 
const items = document.getElementById('items'); 
const entryGetters = {}; 

function clearItems() {
    items.textContent = ''; 
    for (const key in entryGetters) {
        delete entryGetters[key]; 
    }
}

function clearData() {
    clearItems(); 
    localStorage.removeItem('data'); 
    loadDefault(); 
}

function loadDefault() {
    rebuildFromConfig({
        "title": "Sample Log", 
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
            "Exercise": {
                "type": "option", 
                "icon": "🏋️", 
                "values": [
                    "None", 
                    "Some", 
                    "A lot"
                ]
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
            "Something Bad": {
                "type": "text", 
                "icon": "👎"
            }, 
            "Something Good": {
                "type": "text", 
                "icon": "👍"
            }, 
            "Summary": {
                "type": "multiline", 
                "icon": "📓"
            }
        }
    }); 
}

function addTitle(label) {
    const title = document.createElement('h1'); 
    formTitle = label; 
    title.classList.add('form-title'); 
    title.textContent = label; 
    items.appendChild(title); 
}

function addSubmit() {
    const button = document.createElement('button'); 
    button.textContent = "Submit"; 
    button.addEventListener('click', function() {
        const out = {}; 

        for (const key in entryGetters) {
            out[key] = entryGetters[key](); 
        }

        const json = JSON.stringify({
            "version": VERSION, 
            "form": formTitle, 
            "data": out
        }, null, 2); 

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

function getAndAddWrapper(label, data) {
    const elem = document.createElement('div'); 
    elem.classList.add('item'); 
    items.appendChild(elem); 

    const div = document.createElement('div'); 
    div.classList.add('item-top'); 

    if (data.icon) {
        const icon = document.createElement('label'); 
        icon.classList.add('item-icon'); 
        icon.textContent = data.icon; 
        div.appendChild(icon); 
    }

    const title = document.createElement('label'); 
    title.classList.add('item-label'); 
    title.textContent = label; 
    div.appendChild(title); 

    elem.appendChild(div); 
    return elem; 
}

const addInputTypes = {
    text: function(label, data) {
        const input = document.createElement('input'); 
        input.type = 'text'; 
        input.autocomplete = 'off'; 
        input.autocapitalize = 'sentences'; 
        return [input, () => input.value];   
    }, 
    number: function(label, data) {
        const input = document.createElement('input'); 
        input.type = 'number'; 
        input.autocomplete = 'off'; 
        return [input, () => input.value];   
    }, 
    date: function(label, data) {
        const input = document.createElement('input'); 
        input.type = 'date'; 
        input.autocomplete = 'off'; 
        return [input, () => input.value];   
    }, 
    time: function(label, data) {
        const input = document.createElement('input'); 
        input.type = 'time'; 
        input.autocomplete = 'off'; 
        return [input, () => input.value];   
    }, 
    multiline: function(label, data) {
        const input = document.createElement('textarea'); 
        input.type = 'text'; 
        input.autocapitalize = 'sentences'; 
        input.autocomplete = 'off'; 
        return [input, () => input.value];   
    }, 
    range: function(label, data) {
        const input = document.createElement('input'); 
        input.type = 'range'; 
        
        let valueSet = false; 

        const range = data.range;// || [0, 10]; 
        input.min = range[0]; 
        input.max = range[1]; 
        input.value = input.min; 

        function update() {
            valueSet = true; 
            input.parentElement.getElementsByClassName('item-label').item(0).textContent = label + ": " + input.value
        }

        input.addEventListener('input', update);
        input.addEventListener('mousedown', update);

        return [input, () => valueSet ? input.value : ""];  
    }, 
    checkbox: function(label, data) {
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

        return [inputs, () => {
            const out = []; 
            values.forEach(([valueLabel, valueFn]) => {
                if (valueFn()) out.push(valueLabel); 
            });
            return out; 
        }]; 
    }, 
    option: function(label, data) {
        const input = document.createElement('select'); 

        for (const value of ["(no answer)", ...data.values]) {
            const text = document.createElement('option'); 
            text.value = value; 
            text.textContent = value; 
            input.appendChild(text); 
        }

        return [input, () => input.value === "(no answer)" ? "" : input.value]; 
    }
};

function rebuildFromConfig(config) {
    clearItems(); 
    addTitle(config.title); 

    const badItems = []; 

    for (const label in config.items) {
        const data = config.items[label]; 
        if (data.disabled) continue; 

        const type = data.type; 
        
        if (addInputTypes[type]) {
            const [inputs, getter] = addInputTypes[type](label, data); 

            const wrapper = getAndAddWrapper(label, data); 

            if (Array.isArray(inputs)) {
                for (const input of inputs) {
                    wrapper.appendChild(input); 
                }
            }
            else {
                wrapper.appendChild(inputs); 
            }

            entryGetters[label] = getter; 
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

try {
    rebuildFromConfig(JSON.parse(localStorage.getItem('data'))); 
}
catch (e) {
    loadDefault(); 
}
