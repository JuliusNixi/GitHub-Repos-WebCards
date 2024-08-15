# GitHub-Repo-WebCards
Easily create custom web cards containing GitHub's repository data.

## What and why?
During the development of my new static (without backend) blog/website, I wanted to include some data from my coding projects. Since they are hosted on GitHub, I thought it would be best to get the data automatically from GitHub through its APIs, instead of having to manually update the data each time. I looked for projects that did this, but found few resources and almost all of them were very dated. Others had a fixed theme that did not integrate with the style of my site and they were not showing the data I wanted. So I decided to write a small script myself, and hoping it will be useful, I leave it available here for everyone.

## It's really needed? What adds to the GitHub's APIs?
Sincerely no, it's not something of unique and special. Is simply a wrapper of the GitHub's APIs and doesn't add anything to them. However, I think it can be common to want to pull data from GitHub, for example in developer portfolios. It is, of course, possible to make all the desired requests manually from scratch, but this requires some effort and tedium. This project hopes to provide something, while simple, that is workable and provides a stable baseline allowing you to not reinvent the wheel if you only want some basic repo statistics. **It is not meant for complex projects that require sophisticated interactions with GitHub's APIs.**

## Demo
A demo is avaible [here](https://juliusnixi.github.io/GitHub-Repo-WebCards/). It's the 'index.html' this repo file.

## Styles and frameworks agnostic
A key concept of the project is the style and framework agnosticism. In fact, I want anyone to be able to take the data and decide what style to use with them and on what frontend framework. In the future, could be added some default themes, but freedom from styling and tech stack will always be central.

## Autenthication/Backend less/GitHub's APIs rate limit
The GitHub's APIs could be used with or without authentication. In the second case, how you can [see](https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api?apiVersion=2022-11-28), the requests are limited to 60/hour per public IP. Since this script is vanilla javascript that runs on the client, in the first case, the GitHub's APIs personal auth token would be exposed and this could be dangerous and cannot be avoided. To solve this problem a backend solution must be implemented. However, as said before, the idea was to stay more general and simply as possible on the client side, so no GitHub's APIs auth is used, but to prevent to easy hit the rate limit a caching system is present.

## Caching
The script (to prevent GitHub's API's rate limit, read above) has a caching system. Its use is optional but strongly recommended, because without it, with a little use of this script and a few page reloads from the website viewer, it is easy to suffer the limitation of the GitHub's APIs and fail to get and show the data to the website viewer.

## Installation
Two possibility:
* Download the javascript vanilla script from here to serve it with your site's assets, so you are independent.
* Serve it through a CDN in this way (thanks to [jsDelivr](https://www.jsdelivr.com)):
```html
<script src="https://cdn.jsdelivr.net/gh/juliusnixi/GitHub-Repo-WebCards@2.0.0/ghrepocards.js"></script>
```

## Setup
Also here two ways:
* Get data from a specific single repo and its owner.
```html
    <gh-repo-cards
    style="display: none;"
    data-user="GITHUB-USERNAME"
    data-repo="GITHUB-REPO-NAME">

        <div
        class="gh-repo-cards-div">

            <!-- ... DESIRED DATA HERE (SEE BELOW) ... -->

        </div>

    </gh-repo-cards>
```
* Get ALL the repositories data from a GitHub owner.
```html
    <gh-repo-cards
    style="display: none;" data-user="GITHUB-USERNAME"
    data-repo="%all"
    data-sort="created"
    data-direction="desc">

        <div
        class="gh-repo-cards-div">

            <p> ...Optional content... </p>
            <!-- ... DESIRED DATA HERE (SEE BELOW) ... -->

        </div>

    </gh-repo-cards>
```
### All repositories args explaination
Note here the `data-repo="%all"`. '%' is not an admitted character for the GitHub's repository name, so there is no danger of conflict if you wanted to get a single repository with that name, it cannot exist on GitHub.
The `data-sort="created"` and the `data-direction="desc"` attributes are used only in this all mode, otherwise ignored. They are optional, if both not present, the order of the respositories is undefined (random). If the first is present but not the second, an error is throw. If the second is present, but not the first, the second is ignored and no sort is applied. `data-sort` could be one from `['created', 'updated', 'pushed', 'full_name']`. `data-direction` could be one from `['asc', 'desc']`. In this mode the script will clone the `gh-repo-cards-div` and all its content, there will be a new one (copy) for each repo. So in the example above all the repos will have the `<p>` at the beginning.

## General explaination for both modes
* The data will be injected in every `<gh-repo-cards>`.
* The `style="display: none;"` is optional, but recommended, it will automatically removed from this script after the data injection to prevent showing empty html structure to the website viewer during the data download. So **don't use inline CSS on this tag**.
* In each `<gh-repo-cards>` exactly 1 `<div>` with at least the `gh-repo-cards-div` class must be present, otherwise an error is throw. All the html strcture to contain the desired data must be in this div, otherwise their won't be filled.
* The `data-user` and `data-repo` attributes in the `<gh-repo-cards>` must be present and setted respectively to the desired GitHub repository owner and to his repository's name.

## Usage
Wherever and whenever you want simply call the javascript function `GHRepoCardsInit(ENABLE_CACHING)`. The function **must be called only once**, otherwise an error is throw to avoid undefined behaviours. The function must take as arg a boolean. True to enable the cache system, false otherwise. If the cache is disabled, if a cache has been previously setted, it will be cleared. The function will fill all the `gh-repo-cards-div` in the `<gh-repo-cards>` tags with the requested data.

## Avaible datas
```html
<p> Owner's avatar <img width="50px" height="50px" class="gh-repo-cards-avatar" /> </p>
<p class="gh-repo-cards-username">Owner's username: </p>
    
<p class="gh-repo-cards-name">Repo's name: </p>
<p class="gh-repo-cards-description">Repo's description: </p>
<ul class="gh-repo-cards-topics">Repo's topics: </ul>
<ul class="gh-repo-cards-languages">Repo's languages: </ul>
<p class="gh-repo-cards-stars">Repo's stars: </p>
<p class="gh-repo-cards-watchers">Repo's watchers: </p>
<p class="gh-repo-cards-updatedat">Repo updated at: </p>
<p class="gh-repo-cards-forks">Repo's forks: </p>
```
Put the desired html data structure inside the `gh-repo-cards-div`.

## Basic APIs
The functions that compose the script are also avaible as APIs to be called outside the script to allow you to take advantage of them if you need to develop your own custom features. However, if you think these might be useful to everyone you might consider collaborating directly on this repo. To use them see this example:
```javascript
GHRepoCardsInit(true).then(result => {
    // Use APIs here.
    // Optionally here you can also process the data injected however you want.
    result.getData(`users/octocat/followers`).then(e => console.log(e));
});
```
Note that here we take advantage of the `getData()` function to download data that the script itself doesn't get. For all avaible GitHub's APIs endpoints refer [here](https://docs.github.com/en/rest?apiVersion=2022-11-28). Here's the list and signatures:
* `function clearDataLocal(repoName)` : Pass `null` to clear all the repos data saved in the cache. Otherwise, pass the specific repo's name as string to remove it from the cache.
* `function saveDataLocal(repoData)` : Pass the repo object to save in the local cache. `repoData` is a `{}` containing all repo's data. It's the returned value of `getSingleRepo(...)` (see below) call function.
* `function getDataLocal()` : Returns an object `{}` containing as keys the repos' names and as values the `repoData` objects. `repoData` is a `{}` containing all repo's data. It's the returned value of `getSingleRepo(...)` (see below) call function.
* `function putData(repoData, cardDiv)` : Pass the object containing the repo's data to inject in the html structures contained in the `cardDiv`. `repoData` is a `{}` containing all repo's data. It's the returned value of `getSingleRepo(...)` (see below) call function.
* `async function getData(query)` : Pass the query as string. It's the GitHub's API desired endpoint. It's the part of string after `https://api.github.com/`. So this prefix it's prefixed by the function, don't pass it. Its returned value depends from the GitHub's APIs.
* `async function getAllRepos(userString, sortString)` : Pass the GitHub owner username as string. Pass as `sortString` something like `sortString = "&sort=REPOSORT&direction=SORTDIRECTION`, the capsed params are explained above in the "All repositories args explaination" section. No data are saved in the cache. Returns an object `{}` containing as keys the repos' names and as values the `repoData` objects. `repoData` is a `{}` containing all repo's data. It's the returned value of `getSingleRepo(...)` (see below) call function.
* `async function getSingleRepo(userString, repoString)` : Pass the GitHub's repo owner's username as string. Pass the GitHub's repo's name as string. No data are saved in the cache. Returns a `repoData` object. `repoData` is a `{}` rapresenting [this](https://docs.github.com/en/rest/repos/repos?apiVersion=2022-11-28#get-a-repository) response from GitHub's APIs.




