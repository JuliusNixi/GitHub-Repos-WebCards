var GHRepoCardsInit = (() => {

    async function processGHRepoCards(ENABLE_CACHING) {

        const GITHUB_API_SETTINGS = {
            method: 'GET',
            headers: {
                'Accept': 'application/vnd.github+json',
                'X-GitHub-Api-Version': '2022-11-28'
            }           
        };
        
        const GITHUB_API_ENDPOINT = "https://api.github.com/";

        // Null as arg to clear all.
        function clearDataLocal(repoName) {
            if (repoName === undefined || typeof repoName != "string")
                throw new Error(`GitHub-Repos-WebCards: Error in clearDataLocal(). Invalid arg received.`);
            let l = localStorage.length;
            for (let i = 0; i < l; i++) {
                const key = localStorage.key(i);
                const value = localStorage.getItem(key);
                try {
                    const parsedValue = JSON.parse(value);
                    if (parsedValue && typeof parsedValue === 'object')
                        if (parsedValue.expiry && parsedValue.repoData && (repoName === null || repoName === parsedValue.repoData.name))
                            localStorage.removeItem(key);
                } catch (error) {
                    localStorage.removeItem(key);
                    throw new Error(`GitHub-Repos-WebCards: Error in clearDataLocal(): ${error}.`);
                }
            }
        }
        
        function saveDataLocal(repoData) {
            if (repoData === undefined || typeof repoData != "object")
                throw new Error(`GitHub-Repos-WebCards: Error in saveDataLocal(). Invalid arg received.`);
            if (!ENABLE_CACHING) return;
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
            if (!ENABLE_CACHING) return items;
            let l = localStorage.length;
            for (let i = 0; i < l; i++) {
                const key = localStorage.key(i);
                const value = localStorage.getItem(key);
                try {
                    const parsedValue = JSON.parse(value);
                    if (parsedValue && typeof parsedValue === 'object' && parsedValue.expiry && parsedValue.repoData) {
                        const now = new Date();
                        if (now.getTime() > parsedValue.expiry) {
                            localStorage.removeItem(key);
                            continue;
                        }
                        items[key] = parsedValue;
                    }
                } catch (error) {
                    localStorage.removeItem(key);
                    throw new Error(`GitHub-Repos-WebCards: Error in getDataLocal(): ${error}.`);
                }
            }
            return items;
        }
        
        function putData(repoData, cardDiv) {
            if (repoData === undefined || typeof repoData != "object" || cardDiv === undefined)
                throw new Error(`GitHub-Repos-WebCards: Error in putData(). Invalid args received.`);
            let userData = repoData.owner;
            userData.userString = userData.login.toLowerCase();
        
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
        
            appendTextContent(".gh-repos-cards-name", repoData.name);
            setAttribute(".gh-repos-cards-avatar", "src", userData.avatar_url);
            appendTextContent(".gh-repos-cards-username", userData.userString);
            appendTextContent(".gh-repos-cards-description", repoData.description || "");
        
            const topicsContainers = cardDiv.querySelectorAll(".gh-repos-cards-topics");
            topicsContainers.forEach(topicsContainer => {
                if (repoData.repoTopics && repoData.repoTopics.length > 0) {
                    topicsContainer.innerHTML += repoData.repoTopics.map(topic => `<li>${topic}</li>`).join('');
                }
            });
            
            const languagesContainers = cardDiv.querySelectorAll(".gh-repos-cards-languages");
            languagesContainers.forEach(languagesContainer => {
                if (repoData.repoLanguages && Object.keys(repoData.repoLanguages).length > 0) {
                    const sortedLanguages = Object.keys(repoData.repoLanguages)
                        .sort((a, b) => repoData.repoLanguages[b] - repoData.repoLanguages[a]);
                    languagesContainer.innerHTML += sortedLanguages.map(lang => `<li>${lang}</li>`).join('');
                }
            });
        
            appendTextContent(".gh-repos-cards-stars", String(repoData.repoStars));
            appendTextContent(".gh-repos-cards-watchers", String(repoData.repoWatchers));
            appendTextContent(".gh-repos-cards-updatedat", repoData.repoUpdatedAt);
            appendTextContent(".gh-repos-cards-forks", String(repoData.repoForks));
        }
        
        async function getData(query) {
            try {
                const response = await fetch(GITHUB_API_ENDPOINT + query, GITHUB_API_SETTINGS);
                if (!response.ok) {
                    throw new Error(`GitHub-Repos-WebCards: GitHub API request error! Status: ${response.status}.`);
                }
                return await response.json();
            } catch (error) {
                throw new Error(`GitHub-Repos-WebCards: Error in getData(): ${error}.`);
            } 
        }
        
        async function getAllRepos(userString, sortString) {

            if (userString === undefined || sortString === undefined)
                throw new Error(`GitHub-Repos-WebCards: Error in getAllRepos(). Invalid args received.`);

            let allRepos = [];
            let page = 1;

            if (ENABLE_CACHING) {
                const localRepos = getDataLocal();
                const reDownload = !Object.values(localRepos).some(repo => repo.repoData.owner.login.toLowerCase() === userString);
                if (!reDownload){
                    const toRemoveKeys = Object.keys(localRepos).map(e => localRepos[e].repoData).filter(e => e.owner.login.toLowerCase() === userString);
                    toRemoveKeys.forEach(key => delete localRepos[key.name]);
                    localRepos["%reDownloaded"] = false;
                    return localRepos;
                } 
            }

            while (true) {
                let repos = await getData(`users/${userString}/repos?per_page=100&page=${page}${sortString}`);
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
        
            let objAllRepos = {};
            allRepos.forEach((e) => {
                objAllRepos[e.name] = {
                    repoData: e,
                    expiry: 1
                }
            });
            objAllRepos["%reDownloaded"] = true;
            return objAllRepos;
        }
        
        async function getSingleRepo(userString, repoString) {

            if (ENABLE_CACHING) {
                let localRepos = getDataLocal();
                let localRepo = localRepos[repoString];
                if (localRepo != undefined) {
                    localRepo["%reDownloaded"] = false;
                    return localRepo;
                } 
            }
        
            const [repo, topics, languages, watchers] = await Promise.all([
                getData(`repos/${userString}/${repoString}`),
                getData(`repos/${userString}/${repoString}/topics`),
                getData(`repos/${userString}/${repoString}/languages`),
                getData(`repos/${userString}/${repoString}/subscribers`)
            ]);
    
            let repoData = {
                ...repo,
                repoStars: repo.stargazers_count,
                repoUpdatedAt: repo.updated_at,
                repoForks: repo.forks_count,
                repoTopics: topics && topics.names ? topics.names : [],
                repoLanguages: languages || {},
                repoWatchers: watchers.length
            };
                
            return {
                repoData: repoData,
                expiry: 1,
                "%reDownloaded" : true
            };
        }

        // processGHRepoCards() function start.
        let cardsElements = [...document.getElementsByTagName("gh-repos-cards")];

        if (cardsElements.length == 0) {
            console.warn(`GitHub-Repos-WebCards: No <gh-repos-cards> tag found.`);
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

            if (!userString)
                throw new Error(`GitHub-Repos-WebCards: Invalid 'data-user' attribute in <gh-repos-cards> tag.`);
            if (!repoString)
                throw new Error(`GitHub-Repos-WebCards: Invalid 'data-repo' attribute in <gh-repos-cards> tag.`);

            let cardDiv = cardTag.querySelectorAll(".gh-repos-cards-div");
            if (!cardDiv || cardDiv.length != 1) {
                throw new Error(`GitHub-Repos-WebCards: Exactly 1 div with the class 'gh-repos-cards-div' in <gh-repos-cards> tag must be present.`);
            }
            cardDiv = cardDiv[0];

            if (repoString === "%all") {
                // All repos.
                const reposort = cardTag.getAttribute("data-sort")?.toLowerCase();
                const directionsort = cardTag.getAttribute("data-direction")?.toLocaleLowerCase();
                let sortString = "";

                if (reposort) {
                    const admittedsort = ['created', 'updated', 'pushed', 'full_name'];
                    const admitteddirection = ['asc', 'desc'];
                    
                    if (!admittedsort.includes(reposort))
                        throw new Error(`GitHub-Repos-WebCards: Invalid 'data-sort' attribute. Must be one of: ${admittedsort.join(', ')}.`);
                    if (directionsort && !admitteddirection.includes(directionsort))
                        throw new Error(`GitHub-Repos-WebCards: Invalid 'data-direction' attribute. Must be one of: ${admitteddirection.join(', ')}.`);

                    sortString = `&sort=${reposort}&direction=${directionsort}`;
                }

                let repos = await getAllRepos(userString, sortString);
                let reDownload = repos["%reDownloaded"];
                delete repos["%reDownloaded"];
                if (reDownload) Object.values(repos).forEach((e) => saveDataLocal(e.repoData));

                const originalContent = cardDiv.innerHTML;

                Object.values(repos).map(e => e.repoData).forEach((repoFromList, index) => {
                    const newCardDiv = cardDiv.cloneNode(true);
                    newCardDiv.innerHTML = originalContent;
                    putData(repoFromList, newCardDiv);
                    
                    if (index === 0) {
                        cardDiv.innerHTML = newCardDiv.innerHTML;
                    } else {
                        cardTag.appendChild(newCardDiv);
                    }
                });

            } else {
                // Single repo.
                const repoData = await getSingleRepo(userString, repoString);
                const reDownloaded = repoData["%reDownloaded"];
                delete repoData["%reDownloaded"];
                if (reDownloaded)
                    saveDataLocal(repoData.repoData);
                putData(repoData.repoData, cardDiv);
            }

            cardTag.style = "";
        }

        // Export functions to call it directly outside if needed, basic APIs.
        processGHRepoCards.saveDataLocal = saveDataLocal;
        processGHRepoCards.getDataLocal = getDataLocal;
        processGHRepoCards.clearDataLocal = clearDataLocal;
        processGHRepoCards.putData = putData;
        processGHRepoCards.getData = getData;
        processGHRepoCards.getAllRepos = getAllRepos;
        processGHRepoCards.getSingleRepo = getSingleRepo;

        return processGHRepoCards;

    }

    const wrapperInternalInitGHRepoCards = () => {
        let hasBeenCalled = false;

        const singleCallChecker = async function(param) {

            if (param === undefined || typeof param !== 'boolean')
                throw new Error(`GitHub-Repos-WebCards: GHRepoCardsInit(ENABLE_CACHING) must take as arg a boolean. True to enable the cache system, false otherwise.`);

            if (hasBeenCalled)
                throw new Error(`GitHub-Repos-WebCards: Do not call GHRepoCardsInit() multiple times, an error has been generated to prevent undefined behaviours.`);

            hasBeenCalled = true;

            const executeFunction = await processGHRepoCards(param); 

            // Final returned object.
            return executeFunction;

        };

        return singleCallChecker;
    };

    return () => {
        return wrapperInternalInitGHRepoCards();
    };

})()();

