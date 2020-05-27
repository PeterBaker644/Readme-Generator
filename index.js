const fs = require("fs");
const util = require("util");
const axios = require("axios");
const inquirer = require("inquirer");
const writeFileAsync = util.promisify(fs.writeFile);
// const appendFileAsync = util.promisify(fs.appendFile);

const githubPrompt = [
    {   
        type: "input",
        message: "Enter your GitHub username",
        name: "username",
        validate: function(input) {
            if (input == "") {
                return "Please enter a valid username"
            } else {
                return true;
            }
        }
    },
    {
        type: "input",
        message: "Enter the name of the existing github repository",
        name: "repo"
    },
    {
        type: "input",
        message: "Enter the email address associated with your github account.",
        name: "email"
    }
]

const readmeQuery = [
    {
        type: "input",
        message: "Enter the project title (Will use repo name if left blank):",
        name: "title"
    },
    {
        type: "input",
        message: "Provide any installation steps required for your project by the user:",
        name: "installation",
        // transformer: function(input) {
        //     if (input == "") {
        //         return "Installation information will not be included."
        //     } else {
        //         return input;
        //     }
        // }
    },
    {
        type: "input",
        message: "Enter a description of your project:",
        name: "description",
        validate: function(input) {
            if (input == "") {
                return "You must include at least a short project description."
            } else {
                return true;
            }
        }
    },
    {
        type: "input",
        message: "Provide any instructions or steps for usage of your project:",
        name: "usage",
        // transformer: function(input) {
        //     if (input == "") {
        //         return "Usage information will not be included."
        //     } else {
        //         return input;
        //     }
        // }
    },
    {
        type: "confirm",
        message: "Would you like to include CCv2 licensing on this project?",
        name: "contribute"
    },
]

const licenseQuery = [
    {
        type: "list",
        message: "This repository contains no license, if you'd like to an open source license to the README, specify it here:",
        name: "license",
        choices: [
            "MIT",
            "GNU GPLv3",
            "Leave Blank for now"
        ],
        filter: license => (license == "Leave Blank for now") ? none : license
    }
]

function userPrompt(prompt) {return inquirer.prompt(prompt);}

function apiQueryGithub(githubInfo) {
    const { username, repo } = githubInfo;
    const queryUrl = `https://api.github.com/repos/${username}/${repo}`
    return axios.get(queryUrl)
}

async function readmeGenerator(repo, content, license) {
    let readme = "";
    const title = (content.title || repo.name);
    readme += `# ${title}\n`;
    // This begins the badges section
    if (license !== true) {
        if (repo.license !== none) {
            readme += `[![Generic badge](https://img.shields.io/badge/license-${license}-green.svg)](https://shields.io/)] ` 
        }
    } else {
        readme += `[![GitHub license](https://img.shields.io/github/license/${repo.owner.login}/${repo.name})](https://github.com/${repo.owner.login}/${repo.name}/blob/master/LICENSE) `
    }
    readme += (content.contribute == true) ? `[![Contributor Covenant](https://img.shields.io/badge/Contributor%20Covenant-v2.0%20adopted-ff69b4.svg)](https://www.contributor-covenant.org/version/2/0/code_of_conduct/code_of_conduct.md)\n` : '\n';
    // End of the badge section. Add more here if necessary.
    readme += `${content.description}\n`;
    // Add the Table of Contents here.... nightmare
    // readme += `${re}`
    console.log(readme);
    return readme;
}

async function readmePrompts() {
    try {
        console.log(`\nWelcome to the automated CLI readme generator!\nPlease enter Github information as accurately as possible.\n`)
        const github = await userPrompt(githubPrompt);    
        const apiResponse = await apiQueryGithub(github);
        const repoInfo = apiResponse.data;
        console.log(`Any answers left blank will omit sections from the final readme unless otherwise specified`)
        const readmeInfo = await userPrompt(readmeQuery);
        const licenseResponse = (repoInfo.license !== null) 
            ? true 
            : await userPrompt(licenseQuery);
        const readmeBody = await readmeGenerator(repoInfo, readmeInfo, licenseResponse);
        await writeFileAsync("test.md", readmeBody);

    } catch (err) {
        if (err.response.status) {
            console.log("You have entered invalid GitHub information. No valid user or repository could be found by that name.")
        } else {console.log(err)}
    }
}

readmePrompts();