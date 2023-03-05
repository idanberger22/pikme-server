const express = require('express')
const mongoose = require('mongoose')
const Schema = mongoose.Schema


const EventInfoSchema = new Schema({
    players: {
        type: Array,
        required: true
    },
    
    shareWithCommunity:{
        type:Boolean,
        required: true
    },
    date:{
        type:Date,
        required: true
    },
    game :{
        type:String,
        index: true ,
        required: true
    },
    category  :{
        type:String,
        index: true ,
        required: true
    },
    playersTickets :{
        type:Object,
        required: true
    },
   
    over:{
        type:Boolean,
        required: true
    },
    
    payed:{
        type:Boolean,
        required: true
    },
    approved:{
        type:Boolean,
        required: true
    },
    viewers:{
        type:Object ,
        required: true,
        minimize: false
    },
    fund:{
        type:Object ,
        required: false,
        minimize: false
    },
    likes:{
        type:Object ,
        required: true,
        minimize: false
    },
    
},{timestamps:true, minimize: false});
//s

EventInfoSchema.index({ category:"text", game:"text"});
const EventInfo = mongoose.model('EventsInfo', EventInfoSchema);

module.exports = EventInfo;