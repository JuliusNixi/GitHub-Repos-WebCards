async function processGHRepoCards() {

    const GITHUB_API_SETTINGS_GHREPOCARDS = {
        method: 'GET',
        headers: {
            'Accept': 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28'
        }           
    };
    
    const GITHUB_API_ENDPOINT_GHREPOCARDS = "https://api.github.com/";
    
    function saveDataLocal(repoData) {
        const now = new Date();
        let expirationHours = 1;
        const item = {
            repoData: repoData,
            expiry: now.getTime() + (expirationHours * 60 * 60 * 1000)
        };
        let key = repoData.name.toLowerCase();
        localStorage.setItem(key, JSON.stringify(item));
    }
    
    function getDataLocal() {
        const items = {};
        let l = localStorage.length;
        for (let i = 0; i < l; i++) {
            const key = localStorage.key(i);
            const value = localStorage.getItem(key);
            try {
                const parsedValue = JSON.parse(value);
                if (parsedValue && typeof parsedValue === 'object') {
                    const now = new Date();
                    if (now.getTime() > parsedValue.expiry) {
                        localStorage.removeItem(key);
                        continue;
                    }
                    items[key] = parsedValue;
                }
            } catch (error) {
                localStorage.removeItem(key);
                throw new Error(`Error in getDataLocal(): ${error}.`);
            }
        }
        return items;
    }
    
    function putData(repoData, cardDiv, userString) {
        let userData = repoData.owner;
        userData.userString = userString;
    
        function appendTextContent(selector, content) {
            const elements = cardDiv.querySelectorAll(selector);
            elements.forEach(element => {
                element.textContent += content;
            });
        }
    
        function setAttribute(selector, attr, value) {
            const elements = cardDiv.querySelectorAll(selector);
            elements.forEach(element => {
                element.setAttribute(attr, value);
            });
        }
    
        appendTextContent(".gh-repo-cards-name", repoData.name);
        setAttribute(".gh-repo-cards-avatar", "src", userData.avatar_url);
        appendTextContent(".gh-repo-cards-username", userData.userString);
        appendTextContent(".gh-repo-cards-description", repoData.description || "");
    
        const topicsContainers = cardDiv.querySelectorAll(".gh-repo-cards-topics");
        topicsContainers.forEach(topicsContainer => {
            if (repoData.repoTopics && repoData.repoTopics.length > 0) {
                topicsContainer.innerHTML += repoData.repoTopics.map(topic => `<li>${topic}</li>`).join('');
            }
        });
        
        const languagesContainers = cardDiv.querySelectorAll(".gh-repo-cards-languages");
        languagesContainers.forEach(languagesContainer => {
            if (repoData.repoLanguages && Object.keys(repoData.repoLanguages).length > 0) {
                const sortedLanguages = Object.keys(repoData.repoLanguages)
                    .sort((a, b) => repoData.repoLanguages[b] - repoData.repoLanguages[a]);
                languagesContainer.innerHTML += sortedLanguages.map(lang => `<li>${lang}</li>`).join('');
            }
        });
    
        appendTextContent(".gh-repo-cards-stars", String(repoData.repoStars));
        appendTextContent(".gh-repo-cards-watchers", String(repoData.repoWatchers));
        appendTextContent(".gh-repo-cards-updatedat", repoData.repoUpdatedAt);
        appendTextContent(".gh-repo-cards-forks", String(repoData.repoForks));
    }
    
    async function getData(query) {
        try {
            const response = await fetch(GITHUB_API_ENDPOINT_GHREPOCARDS + query, GITHUB_API_SETTINGS_GHREPOCARDS);
            if (!response.ok) {
                throw new Error(`GitHub API error! Status: ${response.status}.`);
            }
            return await response.json();
        } catch (error) {
            throw new Error(`Error in getData(): ${error}.`);
        } 
    }
    
    async function getAllRepos(userString, sortstring) {
        let allRepos = [];
        let page = 1;
        
        while (true) {
            let repos = await getData(`users/${userString}/repos?per_page=100&page=${page}${sortstring}`);
            if (repos.length === 0) break;
            
            const repoPromises = repos.map(async (repo) => {
                const [topics, languages, watchers] = await Promise.all([
                    getData(`repos/${userString}/${repo.name}/topics`),
                    getData(`repos/${userString}/${repo.name}/languages`),
                    getData(`repos/${userString}/${repo.name}/subscribers`)
                ]);
    
                return {
                    ...repo,
                    repoStars: repo.stargazers_count,
                    repoUpdatedAt: repo.updated_at,
                    repoForks: repo.forks_count,
                    repoTopics: topics && topics.names ? topics.names : [],
                    repoLanguages: languages || {},
                    repoWatchers: watchers.length
                };
            });
    
            allRepos.push(...await Promise.all(repoPromises));
            page++;
        }
    
        return allRepos;
    }
    
    async function getSingleRepo(userString, repoString) {
        let localRepos = getDataLocal();
        let repoData = localRepos[repoString];
        
        if (repoData == undefined) {
            const [repo, topics, languages, watchers] = await Promise.all([
                getData(`repos/${userString}/${repoString}`),
                getData(`repos/${userString}/${repoString}/topics`),
                getData(`repos/${userString}/${repoString}/languages`),
                getData(`repos/${userString}/${repoString}/subscribers`)
            ]);
    
            repoData = {
                ...repo,
                repoStars: repo.stargazers_count,
                repoUpdatedAt: repo.updated_at,
                repoForks: repo.forks_count,
                repoTopics: topics && topics.names ? topics.names : [],
                repoLanguages: languages || {},
                repoWatchers: watchers.length
            };
    
            saveDataLocal(repoData);
        } else {
            repoData = repoData.repoData;
        }
    
        return repoData;
    }

    let cardsElements = [...document.getElementsByTagName("gh-repo-cards")];

    if (cardsElements.length == 0) {
        console.warn(`GitHub-Repo-WebCards: No <gh-repo-cards> tag found.`);
        return;
    }

    // Giving priority to %all.
    cardsElements.sort((a, b) => {
        const repoA = a.getAttribute('data-repo');
        const repoB = b.getAttribute('data-repo');
        if (repoA === '%all') return -1;
        if (repoB === '%all') return 1;
        return repoA.localeCompare(repoB);
    });

    for (let cardTag of cardsElements) {
        const userString = cardTag.getAttribute("data-user")?.toLowerCase();
        const repoString = cardTag.getAttribute("data-repo")?.toLowerCase();

        if (!userString) {
            throw new Error(`GitHub-Repo-WebCards: Invalid 'data-user' attribute in <gh-repo-cards> tag.`);
        }
        if (!repoString) {
            throw new Error(`GitHub-Repo-WebCards: Invalid 'data-repo' attribute in <gh-repo-cards> tag.`);
        }

        const cardDiv = cardTag.querySelector(".gh-repo-cards-div");
        if (!cardDiv) {
            throw new Error(`GitHub-Repo-WebCards: Missing div with class 'gh-repo-cards-div' in <gh-repo-cards> tag, at least 1 must be present.`);
        }

        if (repoString === "%all") {
            // All repos.
            const reposort = cardTag.getAttribute("data-sort")?.toLowerCase();
            const directionsort = cardTag.getAttribute("data-direction")?.toLocaleLowerCase();
            let sortstring = "";

            if (reposort) {
                const admittedsort = ['created', 'updated', 'pushed', 'full_name'];
                const admitteddirection = ['asc', 'desc'];
                
                if (!admittedsort.includes(reposort)) {
                    throw new Error(`GitHub-Repo-WebCards: Invalid 'data-sort' attribute. Must be one of: ${admittedsort.join(', ')}.`);
                }
                if (directionsort && !admitteddirection.includes(directionsort)) {
                    throw new Error(`GitHub-Repo-WebCards: Invalid 'data-direction' attribute. Must be 'asc' or 'desc'.`);
                }

                sortstring = `&sort=${reposort}&direction=${directionsort}`;
            }

            const localRepos = getDataLocal();
            const redownload = !Object.values(localRepos).some(repo => repo.repoData.owner.login.toLowerCase() === userString);

            let repolist;
            if (redownload) {
                repolist = await getAllRepos(userString, sortstring);
                repolist.forEach(saveDataLocal);
            } else {
                repolist = Object.values(localRepos).map(e => e.repoData).filter(e => e.owner.login.toLowerCase() === userString);
            }

            const originalContent = cardDiv.innerHTML;

            repolist.forEach((repoFromList, index) => {
                const newCardDiv = cardDiv.cloneNode(true);
                newCardDiv.innerHTML = originalContent;
                putData(repoFromList, newCardDiv, userString);
                
                if (index === 0) {
                    cardDiv.innerHTML = newCardDiv.innerHTML;
                } else {
                    cardTag.appendChild(newCardDiv);
                }
            });

        } else {
            // Single repo.
            const repoData = await getSingleRepo(userString, repoString);
            putData(repoData, cardDiv, userString);
        }

        cardTag.style.display = "block";
    }

    processGHRepoCards.saveDataLocal = saveDataLocal;
    processGHRepoCards.getDataLocal = getDataLocal;
    processGHRepoCards.putData = putData;
    processGHRepoCards.getData = getData;
    processGHRepoCards.getAllRepos = getAllRepos;
    processGHRepoCards.getSingleRepo = getSingleRepo;

}

processGHRepoCards();

