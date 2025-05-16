const mongoose = require("mongoose");

const teamSchema = new mongoose.Schema({
    name:{
        type:String,
        rquired:true,
        unique:true,
    },
    description:{
        type:String
    },
})

module.exports = mongoose.model("Team", teamSchema)