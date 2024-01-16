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


function populateSearchOptions(overwriteUrl='/assets/js/index_dict.json'){
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


















// function levenshteinDistance(a, b) {
//     if (a.length === 0) return b.length;
//     if (b.length === 0) return a.length;

//     const matrix = [];

//     for (let i = 0; i <= b.length; i++) {
//         matrix[i] = [i];
//     }

//     for (let j = 0; j <= a.length; j++) {
//         matrix[0][j] = j;
//     }

//     for (let i = 1; i <= b.length; i++) {
//         for (let j = 1; j <= a.length; j++) {
//             if (b.charAt(i - 1) === a.charAt(j - 1)) {
//                 matrix[i][j] = matrix[i - 1][j - 1];
//             } else {
//                 matrix[i][j] = Math.min(
//                     matrix[i - 1][j - 1] + 1,
//                     matrix[i][j - 1] + 1,
//                     matrix[i - 1][j] + 1
//                 );
//             }
//         }
//     }

//     return matrix[b.length][a.length];
// }

// function cleanString(str) {
//     return str.toLowerCase().replace(/[^a-z0-9]/g, '');
// }

// function searchDictionary(input, dictionary) {
//     const cleanedInput = cleanString(input);
//     const results = [];

//     for (const key in dictionary) {
//         const cleanedPrefLabel = cleanString(key);
//         const distance = levenshteinDistance(cleanedInput, cleanedPrefLabel);

//         results.push({
//             prefLabel: key,
//             id: dictionary[key],
//             distance: distance
//         });
//     }

//     // Sort results based on Levenshtein distance in ascending order
//     results.sort((a, b) => a.distance - b.distance);

//     // Take the top 5 results
//     const top5Results = results.slice(0, 5);

//     return top5Results;
// }


// function performSearch(){
//     // Example usage
//     const dictionary = {
//         "Subject Name": 13545,
//         "Data portability": 31,
//         "SEER definitions": 6,
//         "Balance standing": 24,
//         "Virtual Organisation" : 12,
//         "Additive error" : 10,
//         "Computer aided diagnostics" :21,
//         "Computer Science" :1,
//         "Space transformation" :10,
//         "Data collaboration" : 26,
//         "Information fiels" :2,
//         "Urban Informatics" : 17
//     };
//     // const searchTerm = "data";
//     var searchTerm = document.getElementById('searchInput').value;
//     const searchResults = searchDictionary(searchTerm, dictionary);

//     console.log("Top 5 Search Results:", searchResults);
//     // return top5SearchResults;
//     var dropdownMenu = document.getElementById('searchResultsDropdown');
//     dropdownMenu.innerHTML = '';

//     // Display new results in the dropdown
//     searchResults.forEach(function (result) {
//         var dropdownItem = document.createElement('a');
//         dropdownItem.classList.add('dropdown-item');
//         dropdownItem.href = '#'; // You can set a link if needed
//         dropdownItem.textContent = result.prefLabel;
//         dropdownMenu.appendChild(dropdownItem);
//     });


// }




