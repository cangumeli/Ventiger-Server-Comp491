//Setup babel for imports
require('source-map-support/register')
require('babel-core/register')

//Setup the model
const mongoose = require('mongoose')
mongoose.Promise = global.Promise
const User = require('../../Models/user').default

//Setup chai
const chai = require('chai')
chai.use(require('chai-as-promised'))
const expect = chai.expect


describe("User", function () {
    // Setup the db connection and the model
    before(function () {
        mongoose.connect('mongodb://localhost/VentigerTest/:27017')
    })

    describe("#save", function () {
        //Populate the database
        let fields
        before(function () {
            fields = [{
                phone: '05059309494',
                name: 'Can Gümeli'
            }, {
                phone: '1111',
                name: 'Something Something'
            }]
            return Promise.all(
                fields.map(field => {
                    const user = new User(field)
                    return user.save()
                })
            )
        })

        it("Retrieve the first user", function () {
            return expect(User
                .findOne({phone: fields[0].phone})
                .exec()
                .then(user => user.name))
                .to.eventually.equal(fields[0].name)
        })
        
        it('Retrieve the other user', function () {
            return expect(
                User
                    .findOne({phone: fields[1].phone})
                    .exec()
                    .then(user => user.name))
                .to.eventually.equal(fields[1].name)

        })

        it('Disallow duplicate phone numbers', function (done) {
            let user = new User(fields[0])//{phone: fields[0].name, name: fields[1].phone})
            //Chai fails in rejections,
            user.save((err) => {
                expect(err).to.exist
                done()
            })
        })

        describe('After reset', function () {
            before(function () {
                User
                    .findOneAndRemove({phone: fields[0].phone})
                    .exec()
            })

            it('Allow save with legal credentials', function () {
                let app = new User(fields[0])
                return app.save()
            })
            it('Disallow save with illegal credentials', function (done) {
                let app = new User(fields[0])
                app
                    .save(err => {
                        expect(err).to.exist
                        done()
                    })
            })
        })
    })

    after(function () {
        return mongoose.connection.db.dropDatabase(err => {
            console.error(err)
        })
    })
})