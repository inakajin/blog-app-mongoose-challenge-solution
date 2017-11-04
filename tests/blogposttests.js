const chai = require('chai');
const chaiHttp = require('chai-http');
const faker = require('faker');
const mongoose = require('mongoose');

const should = chai.should();

const {BlogPost} = require('../models');

const {app, runServer, closeServer} = require('../server');

const {DATABASE_URL} = require('../config');
const {TEST_DATABASE_URL} = require('../config');
chai.use(chaiHttp);


//Seed blog data
function seedBlogData() {
    console.info('seeding blog data');
    const seedData = [];
  
    for (let i=1; i<=10; i++) {
      seedData.push(generateBlogPost());
    }
    // this will return a promise
    return BlogPost.insertMany(seedData);
  }

  //generate author data
  function generateAuthorName() {
      return {
        firstName: faker.name.firstName(),
        lastName: faker.name.lastName()
      }
  }
  function generatePostTitle() {
      return faker.lorem.sentence()
      
  }
function generateContent() {
    return faker.lorem.paragraphs()
}

function generatePostDate() {
    return faker.date.past()
}

//generate a blog post
function generateBlogPost() {
    return {
        author: generateAuthorName(),
        content: generateContent(),
        title: generatePostTitle(),
        created: generatePostDate()
    }
}

//drop the database
function tearDownDb() {
    console.warn('Deleting database');
    return mongoose.connection.dropDatabase();
}

//Stop and Start Server Functions
describe('BlogPosts API resource', function() {
    
      // we need each of these hook functions to return a promise
      // otherwise we'd need to call a `done` callback. `runServer`,
      // `seedRestaurantData` and `tearDownDb` each return a promise,
      // so we return the value returned by these function calls.
      before(function() {
        return runServer(TEST_DATABASE_URL);
      });
    
      beforeEach(function() {
        return seedBlogData();
      });
    
      afterEach(function() {
        return tearDownDb();
      });
    
      after(function() {
        return closeServer();
      });

//Test GET API endpoint
describe('GET endpoint', function() {
    
        it('should return all blog posts', function() {
   
          let res;
          return chai.request(app)
            .get('/posts')
            .then(_res => {
              // so subsequent .then blocks can access resp obj.
              res = _res;
              res.should.have.status(200);
              // otherwise our db seeding didn't work
              res.body.should.have.length.of.at.least(1);
              return BlogPost.count();
            })
            .then(count => {
                console.log(res.body);
              res.body.should.have.length(count);
            });
        });
        it('should return posts with right fields', function() {
            let resPost;
            return chai.request(app)
            .get('/posts')
            .then(function(res) {
                res.should.have.status(200);
                res.should.be.json;
                res.body.should.be.a('array');
                res.body.should.have.length.of.at.least(1);

                res.body.forEach(function(post) {
                    post.should.be.a('object');
                    post.should.include.keys(['id', 'title', 'content', 'author', 'created']);
                });
                resPost = res.body[0];
                return BlogPost.findById(resPost.id);
            })
            .then(post => {
                resPost.title.should.equal(post.title);
                resPost.content.should.equal(post.content);
                resPost.author.should.equal(post.authorName);
            });
        });
    });

//Test Post API Endpoint - new entry
describe('POST endpoint', function() {
    it('should add a new blog post', function() {
        const newPost = {
            title:faker.lorem.sentence(),
            author: {
                firstName: faker.name.firstName(),
                lastName: faker.name.lastName()
              },
            content: faker.lorem.paragraphs()
        };

        return chai.request(app)
            .post('/posts')
            .send(newPost)
            .then(function(res) {
                res.should.have.status(201);
                res.should.be.json;
                res.body.should.be.a('object');
                res.body.should.include.keys([
                  'id', 'title', 'content', 'author', 'created']);
                res.body.title.should.equal(newPost.title);
                // cause Mongo should have created id on insertion
                res.body.id.should.not.be.null;
                res.body.author.should.equal(
                  `${newPost.author.firstName} ${newPost.author.lastName}`);
                res.body.content.should.equal(newPost.content);
                return BlogPost.findById(res.body.id);
              })
            .then(function(post) {
                post.title.should.equal(newPost.title);
                post.content.should.equal(newPost.content);
                post.author.firstName.should.equal(newPost.author.firstName);
                post.author.lastName.should.equal(newPost.author.lastName);
            });
        });
    });


//Test Post API Endpoint - update
describe('PUT endpoint', function() {
    it('should update fields you send over', function() {
        const updateData = {
            title: 'curb your enthusiasm',
            content: 'pretty pretty pretty good',
            author: {
                firstName: 'no',
                lastName: 'one'
            }
        };

        return BlogPost
            .findOne()
            .then(post => {
                updateData.id = post.id;

                return chai.request(app)
                    .put(`/posts/${post.id}`)
                    .send(updateData);
            })
            .then(res => {
                res.should.have.status(204);
                return BlogPost.findById(updateData.id);
            })
            .then(post => {
                post.title.should.equal(updateData.title);
                post.content.should.equal(updateData.content);
                post.author.firstName.should.equal(updateData.author.firstName);
                post.author.lastName.should.equal(updateData.author.lastName);
            });
        });
});

//Test Delete API Endpoint 
describe('DELETE endpoint', function() {
    it('should delete a post by id', function() {

        let post;

        return BlogPost
            .findOne()
            .then(_post => {
                post = _post;
                return chai.request(app).delete(`/posts/${post.id}`);
            })
            .then(res => {
                res.should.have.status(204);
                return BlogPost.findById(post.id);
            })
            .then(_post => {
                should.not.exist(_post);
            });
        });
    });
    
});