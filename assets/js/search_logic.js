var jsonFileUrl = '';
var indexDict = null;

function performSearch() {
    var inputText = document.getElementById("userSearch").value;
    var possibleSearchesDatalist = document.getElementById("possibleSearches");
    var datalistOptions = possibleSearchesDatalist.options;

    // checking if the input is in concepts list
    var found = false;
    for (var i = 0; i < datalistOptions.length; i++) {
        if (datalistOptions[i].value === inputText) {
            found = true;
            break;
        }
    }

    var errorModal = new bootstrap.Modal(document.getElementById('errorModal'));

        if (!found) {
            // error pop up if the concept is not found
            document.getElementById("errorMessage").innerHTML = 'Error: Please search a valid concept name.';
            errorModal.show();
        }else{
            try {
                let conceptNumber = getNumberByName(inputText);
                window.location.hash = conceptNumber;
                document.getElementById("userSearch").value = "";
                
            } catch (error) {
                console.error(error);
            }
            // getNumberByName(inputText)
            // .then(res => {
            //     conceptNumber = res;
            //     // console.log(conceptNumber);
            //     // rednering new concept
            //     window.location.hash = conceptNumber;
            //     // renderer.renderEntity(conceptNumber);
            //     document.getElementById("userSearch").value = "";
            // })
            // .catch(error => {
            //     console.error(error);
            // });
        }

}


function getNumberByName(name) {

    // rewrite this 
    if (indexDict && indexDict[name]) {
        const conceptNumber = indexDict[name]
        return conceptNumber;
    } else {
        throw 'Name not found in dictionary';
    }
    
}


function populateSearchOptions(overwriteUrl='/assets/data/core/index_dict.json'){
    jsonFileUrl = overwriteUrl
    fetch(jsonFileUrl)
        .then(response => response.json())
        .then(data => {
            const possibleSearchesDatalist = document.getElementById('possibleSearches');
            indexDict = data;
            // Populate options with keys from the JSON dictionary
            for (const key in data) {
                if (data.hasOwnProperty(key)) {
                    const option = document.createElement('option');
                    option.value = key;
                    possibleSearchesDatalist.appendChild(option);
                }
            }
        })
        .catch(error => {
            console.error('Error fetching JSON:', error);
        });

}


function enterSearch(event) {
    var x = event.code;
    if(x == "Enter") {
        console.log("kliknelo enter")
        event.preventDefault();
        document.getElementById("searchButton").click(); 
    }    
}






