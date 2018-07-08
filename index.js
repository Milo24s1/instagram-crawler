#!/usr/bin/env node

const { promisify } = require('util');
const fs = require('fs');
const puppeteer = require('puppeteer');
const meow = require('meow');
const ora = require('ora');
const writeYaml = require('write-yaml');
const element = require('./element.json');
const writeFileAsync = promisify(fs.writeFile);
const writeYamlAsync = promisify(writeYaml);
const timestamp = Math.floor(Date.now() / 1000);

const cli = meow(
	`
	Usage
    	$ instagram-profilecrawl <name>

	Options
		--output -o           define output format (JSON, YAML)
		--limit -l	  	      get only the number of post defined by the limit
		--interactive -i	  no headless mode

	Examples
		$ instagram-profilecrawl nacimgoura
		$ instagram-profilecrawl nacimgoura -o yaml
		$ instagram-profilecrawl nacimgoura -o yaml - l 10
`,
	{
		flags: {
			output: {
				type: 'string',
				alias: 'o'
			},
			limit: {
				type: 'string',
				alias: 'l'
			},
			interactive: {
				type: 'boolean',
				alias: 'i'
			}
		}
	}
);

const CrawlerInstagram = class {
	constructor() {
		this.spinner = ora('Beginning of the crawl!').start();
	}

	async start({ input, flags }) {
		// Variable
		this.input = input[0];
		this.output = flags && flags.output ? flags.output : null;
		this.limit = flags && flags.limit ? flags.limit : null;
		this.interactive = flags && flags.interactive ? flags.interactive : false;


		//Read Profile from already existing json
		let lastDataSet = undefined;
        try{
            let rawData = fs.readFileSync(`${this.input}.json`);
            lastDataSet = JSON.parse(rawData);
        }
        catch(err){
            this.spinner.info('No Data file exists');
        }

        // Init browser
		this.browser = await puppeteer.launch({
			headless: !this.interactive,
			args: ['--lang=en-US', '--disk-cache-size=0']
		});

		// Go to profile page in english
		this.page = await this.browser.newPage();
		await this.page.setExtraHTTPHeaders({
			'Accept-Language': 'en-US'
		});
		await this.page.goto(`https://instagram.com/${input}`, {
			waitUntil: 'networkidle0'
		});

		// Close if profil doesn't exist
		if (await this.page.$(element.notExist)) {
			this.spinner.fail("Profile doesn't exist");
			process.exit();
		}

		// FUTUR: await this.login();

		try {
			this.dataProfile = {
				urlProfile: this.page.url(),
				...(await this.getInfoProfile(lastDataSet)),
				posts: await this.getDataPostProfile(lastDataSet)
			};
			this.spinner.succeed('end crawl profile!');
			await this.writeProfile();
			this.spinner.succeed('file created with success!');
		} catch (error) {
			console.error(error);
			this.spinner.fail('Unable to crawl profile data!');
			process.exit();
		}
		await this.browser.close();
	}

	// Get info in profil
	async getInfoProfile(lastDataSet) {
		this.spinner.info('Get profile info!');
		return this.page.evaluate(({element,timestamp,lastDataSet}) => {


		    let profileStatsObject = {};
		    let profileStatsObjectArray = [];
		    let graphhql = window._sharedData.entry_data.ProfilePage[0].graphql;

            profileStatsObject[timestamp]= {

                numberPosts: graphhql.user.edge_owner_to_timeline_media.count,
                numberFollowers: graphhql.user.edge_followed_by.count,
                numberFollowing: graphhql.user.edge_follow.count
            };

            if(lastDataSet != undefined){
                profileStatsObjectArray = lastDataSet.profileStats;
            }
            profileStatsObjectArray.push(profileStatsObject);

			 return {
				// alias: document.querySelector(element.alias).innerText,
				username: graphhql.user.username,
				descriptionProfile: graphhql.user.biography ? graphhql.user.biography : '',
				urlImgProfile: graphhql.user.profile_pic_url,
				website: graphhql.user.external_url_linkshimmed
					? graphhql.user.external_url_linkshimmed
					: null,
                profileStats:profileStatsObjectArray,
				private: graphhql.user.is_private,
				isOfficial: graphhql.user.is_verified
			};
		}, {element,timestamp,lastDataSet});
	}

	// Get data for each post
	async getDataPostProfile(lastDataSet) {
		this.spinner.info('Get list post!');
		let numberPosts = await this.page.evaluate(element => {
            let graphhql = window._sharedData.entry_data.ProfilePage[0].graphql;
            if(!graphhql.user.is_private){
            	return graphhql.user.edge_owner_to_timeline_media.count;
			}
			return 0;
		}, element);

		if(numberPosts==0){
			return {};
		}

		if (this.limit) {
			if(numberPosts<this.limit){
                this.limit = numberPosts;
			}
			numberPosts = this.limit;
		}
		const listPostUrl = new Set();
		// Get all post url
		while (listPostUrl.size < Number(numberPosts)) {
			const listUrl = await this.page.$$eval(element.listPost, list =>
				list.map(n => n.getAttribute('href'))
			);
			listUrl.forEach(url => {
				if (!this.limit || (this.limit && listPostUrl.size < this.limit)) {
					listPostUrl.add(url);
				}
			});
			await this.page.evaluate(() => {
				window.scrollTo(0, 1000000);
			});
		}

		await this.page.close();

		const listPost = {};

		this.spinner.info('Crawl each post!');
		for (const url of listPostUrl) {
			const page = await this.browser.newPage();
			await page.goto(`https://instagram.com${url}`, {
				waitUntil: 'networkidle0'
			});
			this.spinner.info(`crawl -> ${url}`);

            let uniqueKey = url.split("/")[2];


			const data = await page.evaluate(({element,timestamp,lastDataSet,uniqueKey,url})=> {

			    let postStatsObject = {};
			    let postStatsObjectArray = [];
			    let graphql= window._sharedData.entry_data.PostPage[0].graphql.shortcode_media;

				let isVideo = graphql.is_video;
				let isMultipleImage = graphql.edge_sidecar_to_children == undefined? false: true;
				let urlImage = [];

				if(isMultipleImage){
                    urlImage = graphql.edge_sidecar_to_children.edges.map(edge => edge.node.display_resources);

				}
				else{
                    urlImage = graphql.display_resources;
				}


			    postStatsObject[timestamp]= {
                    numberLike: graphql.edge_media_preview_like.count
                        ? graphql.edge_media_preview_like.count
                        : null,
                    numberView: isVideo
                        ? graphql.video_view_count
                        : null,
                    numberComments:graphql.edge_media_to_comment.count?graphql.edge_media_to_comment.count:null
                };

			    if(lastDataSet!=null && lastDataSet.posts[uniqueKey]!=undefined){

                    postStatsObjectArray = lastDataSet.posts[uniqueKey].postStats;
                }
                postStatsObjectArray.push(postStatsObject);

				return {
					url: 'https://instagram.com'+url,

					urlImage: urlImage,
					isVideo: isVideo,
					video: isVideo ? graphql.video_url : null,
                    postStats: postStatsObjectArray,
					description: document.querySelector(element.description)
						? document.querySelector(element.description).innerText
						: null,
					tags: document.querySelector(element.tags)
						? document.querySelector(element.tags).innerText.match(/#\w+/g)
						: [],
					mentions:
						[...document.querySelectorAll(element.mentions)].map(item =>
							item.getAttribute('href')
						) || [],
					date: document.querySelector(element.date).getAttribute('datetime'),
					multipleImage: isMultipleImage
				};
			}, {element,timestamp,lastDataSet,uniqueKey,url});
			// if (data.multipleImage === true) {
			// 	data.urlImage = [data.urlImage];
			// 	while ((await page.$(element.multipleImage)) !== null) {
			// 		await page.click(element.multipleImage);
			// 		data.urlImage.push(await page.$eval(element.urlImage, a => a.srcset));
			// 	}
			// }
			await page.close();

            listPost[uniqueKey]= data;

		}
		return listPost;
	}

	// Enable to crawl private profile (For the futur)
	async login() {}

	// Write profile in file
	async writeProfile() {
		if (this.output === 'yaml') {
			return writeYamlAsync(`${this.input}.yml`, this.dataProfile);
		}
		return writeFileAsync(
			`${this.input}.json`,
			JSON.stringify(this.dataProfile, null, 2)
		);
	}
};

// Start program
const crawler = new CrawlerInstagram();
crawler.start(cli).catch(error => console.error(error));
