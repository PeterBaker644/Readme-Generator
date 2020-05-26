const fs = require("fs");
const util = require("util");
const axios = require("axios");
const inquirer = require("inquirer");
const writeFileAsync = util.promisify(fs.writeFile);

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
        type: "input",
        message: "This repository contains to license, if you'd like to an open source license to the README, specify it here:",
        name: "contribute",
        // transformer: function(input) {
        //     if (input == "") {
        //         return "No license will be included"
        //     } else {
        //         return input;
        //     }
        // }
    }
]

function userPrompt(prompt) {return inquirer.prompt(prompt);}

function apiQueryGithub(githubInfo) {
    const { username, repo } = githubInfo;
    const queryUrl = `https://api.github.com/repos/${username}/${repo}`
    return axios.get(queryUrl)
}

async function readmePrompts() {
    try {
        console.log(`\nWelcome to the automated CLI readme generator!\nPlease enter Github information as accurately as possible.\n`)
        const github = await userPrompt(githubPrompt);    
        const apiResponse = await apiQueryGithub(github);
        const repoInfo = apiResponse.data;
        console.log(`Any answers left blank will omit sections from the final readme unless otherwise specified`)
        const readmeInfo = await userPrompt(readmeQuery);
        if (repoInfo.license == null) {
            const licenseReponse = await userPrompt(licenseQuery)
        }
        const readmeBody = readmeGenerator(repoInfo, readmeInfo);
        await writeFileAsync("readme.md", readmeBody);

    } catch (err) {
        if (err.response.status == 404) {
            console.log("You have entered invalid GitHub information. No valid user or repository could be found by that name.")
        } else {console.log(err)}
    }
}

readmePrompts();