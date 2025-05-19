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
    members:[
        {
            type:String,
            required:true
        }
    ]
})

module.exports = mongoose.model("Team", teamSchema)