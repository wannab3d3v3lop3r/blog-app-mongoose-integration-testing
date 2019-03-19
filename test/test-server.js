const mongoose = require('mongoose');
const chai = require('chai');
const chaihttp = require('chai-http');
const faker = require('faker');

// this makes the expect syntax available throughout
// this module
// theres also should but not going to use it
const expect = chai.expect;

const {runServer, app, closeServer} = require('../server');
const {BlogPost} = require('../models');
const {TEST_DATABASE_URL} = require('../config');


chai.use(chaihttp);

function generateBlogPostData(){
    return blogPostObjects = {
        author: {
            firstName: faker.name.firstName(),
            lastName: faker.name.lastName()
          },
          title: faker.name.title(),
          content: faker.lorem.sentence()
        }
};

function seedData(){
    console.log(`Seeding data`);

    const seedData = [];

    for(let i = 0; i < 10; i++){
        seedData.push(generateBlogPostData());
    }

    return BlogPost.insertMany(seedData);
};



// this function deletes the entire database.
// we'll call it in an `afterEach` block below
// to ensure data from one test does not stick
// around for next one
function tearDownDb() {

    console.warn('Deleting database');
    // return mongoose.connection.dropDatabase();

    return new Promise((resolve,reject) => {
        mongoose.connection.dropDatabase()
        .then(result => { resolve(result)})
        .catch(err => { reject(err)})
    })
  }

/* Finally, let's look at the before, beforeEach, afterEach, and after routines at the top of our describe('Restaurants API resource') 
function. For each of these, we return the result of running a function that itself returns a Promise. When working with Mocha, 
these hook functions need to either call a done callback or return a Promise. */
describe('Testing BlogPost',function(){

    /*The before routine is responsible for starting the server. */
    before(function(){
        /*It connects to the database and starts listening for connections.*/
        return runServer(TEST_DATABASE_URL);
    })

    //The beforeEach routine seeds our database with test data before each test runs.
    beforeEach(function(){
        return seedData();
    })

    //The afterEach routine zeroes out the database after each test has run.
    //we ensure that there are no dependencies between tests.
    afterEach(function(){
        return tearDownDb();
    })

    //Finally, the after routine calls closeServer after all the tests in this module have run
    after(function(){
        return closeServer();
    })

    // note the use of nested `describe` blocks.
    // this allows us to make clearer, more discrete tests that focus
    // on proving something small
    describe('GET endpoint', function() {

        it('responds with an array given blogpost in database', function() {

            // At the top of this test, we declare a res variable. We do this because we need a place to store some data to use across .then calls.
            let res;

            //pretending to make an ajax request to
            //can see headers,req, response, etc.
            return chai.request(app)
                //posts
                .get('/posts')
                //response from the server
                .then(function(_res){
                    res = _res;

                    expect(res).to.have.status(200);
                    expect(res.body).to.have.lengthOf.at.least(1);
                })
        });

        it('responds with the correct fields', function() {

            let resBlogPost;
            return chai.request(app)
                .get('/posts')
                .then(function(res){
                    expect(res).to.have.status(200);
                    expect(res).to.be.json;
                    expect(res.body).to.be.a('array');
                    expect(res.body).to.have.lengthOf.at.least(1);

                    res.body.forEach(function(blogPostFields){
                        expect(blogPostFields).to.be.a('object');
                        expect(blogPostFields).to.include.keys(
                            'author','title','content');
                    })

                    resBlogPost = res.body[0];

                    return BlogPost.findById(resBlogPost.id);
                })
                .then((blogpost) => {
                    expect(resBlogPost.id).to.equal(blogpost.id);
                    expect(resBlogPost.author).to.equal(`${blogpost.author.firstName} ${blogpost.author.lastName}`);
                    expect(resBlogPost.title).to.equal(blogpost.title);
                    expect(resBlogPost.content).to.equal(blogpost.content);
                })
        });
    })


        describe('Post Endpoints', function(){
            it('should be able to add a new blogPost',() => {
                const newBlog = generateBlogPostData();

                return chai.request(app)
                    .post('/posts')
                    .send(newBlog)
                    .then((res) => {
                        expect(res).to.have.status(201);
                        expect(res).to.be.json;
                        expect(res.body).to.be.a('object');
                        expect(res.body).to.include.keys(
                            'author','title','content'
                        );
                        expect(res.body.author).to.equal(`${newBlog.author.firstName} ${newBlog.author.lastName}`)
                        expect(res.body.id).to.not.be.null;
                        expect(res.body.title).to.equal(newBlog.title);
                        expect(res.body.content).to.equal(newBlog.content);

                        return BlogPost.findById(res.body.id);
                    })
                    //blogpost is the database BlogPost documment
                    .then((blogpost) => {
                        expect(`${blogpost.author.firstName} ${blogpost.author.lastName}`).to.equal(`${newBlog.author.firstName} ${newBlog.author.lastName}`)
                        expect(blogpost.title).to.equal(newBlog.title);
                        expect(blogpost.content).to.equal(newBlog.content);
                    })
            })
        })

        describe('Put Endpoints',() => {
            it('update database and checks to see if the database was updated with the correct request', () => {

                const updateData = {
                    title: 'Title',
                    content: 'Content'
                };

                return BlogPost
                    .findOne()
                    .then((blogpost) => {
                        /* updateData.id creates an id key to the updateData object*/
                        updateData.id = blogpost.id;

                        //opens a server, makes a request to the put endpoint and sends this req.body to the server
                        //returns a promise
                        return chai.request(app)
                            .put(`/posts/${blogpost.id}`)
                            .send(updateData);
                    })
                    .then((res) => {
                        //comes back with json data with 204 status code
                        expect(res).to.have.status(204);

                        //find document in the database that was updated
                        return BlogPost.findById(updateData.id);
                    })
                    //check the document to see if it has the expected values
                    .then((blogpost) => {
                        expect(blogpost.title).to.eql(updateData.title);
                        expect(blogpost.content).to.eql(updateData.content);
                    })
                })
        })

        describe('Delete Endpoint', () => {
            it('deletes document in the database', () => {
                let blogpost;

                return BlogPost
                    .findOne()
                    .then((_blogpost) => {
                        blogpost = _blogpost;
                        return chai.request(app).delete(`/posts/${blogpost.id}`);
                    })
                    .then((res) => {
                        expect(res).to.have.status(204);
                        return BlogPost.findById(blogpost.id);
                    })
                    .then((blogpost) =>{
                        expect(blogpost).to.be.null;
                    })
            })
        })

})