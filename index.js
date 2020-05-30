const fs = require("fs");
const util = require("util");
const axios = require("axios");
const inquirer = require("inquirer");
const writeFileAsync = util.promisify(fs.writeFile);

//Inquirer prompt arrays
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

const readmePrompt = [
    {
        type: "input",
        message: "Enter the email address associated with your github account.",
        name: "email",
        validate: function(input) {
            if (input == "") {
                return "You must provide an email address. Yes, it is absurd."
            } else {
                return true;
            }
        }
    },
    {
        type: "input",
        message: "Enter the project title (Will use repo name if left blank):",
        name: "title"
    },
    {
        type: "input",
        message: "Provide any installation steps required for your project by the user:",
        name: "installation",
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
    },
    {
        type: "input",
        message: "What command (if any) should be run to run tests:",
        name: "test",
    },
    {
        type: "confirm",
        message: "Would you like to include CCv2 licensing on this project?",
        name: "contribute",
        default: false
    },
]

const licensePrompt = [
    {
        type: "list",
        message: "This repository contains no license. If you'd like to add an open source license to the README, specify it here:",
        name: "license",
        choices: [
            "MIT",
            "GNU GPLv3",
            "Leave blank for now."
        ],
        filter: function(license) {
            switch(license) {
                case "MIT":
                    return "MIT";
                case "GNU GPLv3":
                    return "GNU_GPLv3";
                case "Leave blank for now.":
                    return "none";            
            }
        },
    }
]

function userPrompt(prompt) {return inquirer.prompt(prompt);}

//Axios github query
function apiQueryGithub(githubInfo) {
    const { username, repo } = githubInfo;
    const queryUrl = `https://api.github.com/repos/${username}/${repo}`;
    return axios.get(queryUrl);
}

//Dynamically generated table of contents
function generateToc(repo, content, license) {
    let toc = `<details>\n<summary>Table of Contents</summary>\n\n## Table of Contents\n* Title\n* Description\n`;
    toc += content.installation ? `* [Installation](#installation)\n` : '';
    toc += content.usage ? `* [Usage](#usage)\n` : '';
    toc += (repo.license !== "none" || license.license !== "none") ? `* [License](#license)\n` : '';
    toc += content.contribute ? `* [Contributing](#contributing)\n` : '';
    toc += content.test ? `* [Testing](#testing)\n` : '';
    toc += `* [User Info](#user-info)\n\n</details>`;
    return toc;
}

//Readme assembler
async function readmeGenerator(repo, content, license) {
    try {
        let readme = "";
        //User Avatar
        readme += `<img src="${repo.owner.avatar_url}" alt="Github Avatar" width="150" align="right" />\n\n`;
        //Title
        const title = (content.title || repo.name);
        readme += `# ${title}\n\n`;
        // Append readme badges
        if (license !== true) {
            if (repo.license !== "none") {
                readme += `[![Generic badge](https://img.shields.io/badge/license-${license.license}-green.svg)](https://shields.io/) `;
            }
        } else {
            readme += `[![GitHub license](https://img.shields.io/github/license/${repo.owner.login}/${repo.name})](https://github.com/${repo.owner.login}/${repo.name}/blob/master/LICENSE) `;
        }
        readme += (content.contribute == true) ? `[![Contributor Covenant](https://img.shields.io/badge/Contributor%20Covenant-v2.0%20adopted-ff69b4.svg)](https://www.contributor-covenant.org/version/2/0/code_of_conduct/code_of_conduct.md)\n\n` : '\n\n';
        //Description
        readme += `${content.description}\n\n`;
        //Test link (if available)
        readme += repo.homepage ? `Test out the project here: [${repo.name}](${repo.homepage})\n\n` : '';
        //Table of Contents
        readme += `${generateToc(repo, content, license)}\n\n`;
        //Installation (if included)
        readme += content.installation ? `## Installation\n${content.installation}\n\n` : '';
        //Usage (if included)
        readme += content.usage ? `## Usage\n${content.usage}\n\n` : '';
        //License (if included)
        readme += (repo.license !== "none" || license.license !== "none") ? `## License\nThis repository uses an open-source license. Please check the readme badges or refer to the license documentation in the repository for more information.\n\n` : '';
        //Contribution (if included)
        readme += content.contribute ? `## Contributing\n\nPlease note that this project is released with a Contributor Code of Conduct. By participating in this project you agree to abide by its terms.\n\n` : '';
        //Testing (if included)
        readme += content.test ? `## Testing\n\nTo test this project, run the following commands:\n${content.test}` : '';
        //User Info
        readme += `## User Info\nThis project was authored by ${repo.owner.login}.\nYou can contact them here to report any issues: <a href="mailto:${content.email}">Report Issues</a>\n\nDon't use github for issues that would be dumb. Also please send all the junk mail.`
        return readme;
    } catch(err) {
        console.log(err);
    }
}

//Main function
async function readmeInit() {
    try {
        console.log(`\nWelcome to the automated CLI readme generator!\nPlease enter Github information as accurately as possible.\nAny answers left blank will omit sections from the final readme unless otherwise specified.\n`);
        const github = await userPrompt(githubPrompt);    
        const apiResponse = await apiQueryGithub(github);
        const repoInfo = apiResponse.data;
        const readmeInfo = await userPrompt(readmePrompt);
        const licenseResponse = (repoInfo.license !== null) 
            ? true 
            : await userPrompt(licensePrompt);
        const readmeBody = await readmeGenerator(repoInfo, readmeInfo, licenseResponse, github);
        await writeFileAsync(`${repoInfo.name}_README.md`, readmeBody);
        console.log(`\n${repoInfo.name}_README.md has been successfully generated!`)

    } catch (err) {
        if (err.response.status) {
            console.log("You have entered invalid GitHub information. No valid user or repository could be found by that name.")
        } else {console.log(err)}
    }
}

readmeInit();