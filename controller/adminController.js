const express = require("express");
const router = express.Router();
const moment = require('moment');
const fs = require('fs');
const bodyparser = require("body-parser");
const urlencoder = bodyparser.urlencoded({
    extended : true
});

const {Doctor} = require("../model/doctor");
const {Process} = require("../model/process");
const {Account} = require("../model/account");
const {Schedule} = require("../model/schedule");
const {BreakTime} = require("../model/breaktime");
const {UnavailableDate} = require("../model/unavailableDate");

router.get("/", async (req, res) => {
    let admin = await Account.getAccountByUsername("admin");
    if(req.session.username == "admin") {
        res.render("page_templates/admin-view.hbs", {
            password: admin.password
        });
    } else {
        res.redirect("/login");
    }
})

router.post("/updateAccountPassword", async (req, res) => {
    let account = await Account.getAccountByUsername(req.body.username);
    if(req.body.username == "admin") {
        Account.updateAccount(account.id, req.body.newPassword);
        res.send({message: true});
    } else {
        if(account == undefined) {
            res.send({message: false});
        } else {
            Account.updateAccount(account.id, req.body.newPassword);
            res.send({message: true});
        }
    }
})

router.post("/editAccount", (req, res) => {
    Account.updateAccount(req.body.accountID, req.body.accountPassword);
    res.send(true);
})

router.post("/addAccount", async (req, res) => {
    let user = await Account.getAccountByUsername(req.body.username);
    if(user == undefined) {
        Account.addAccount(new Account({
            username: req.body.username,
            password: req.body.password,
            accountType: req.body.type,
            doctorID: "",
            lastLogin: ""
        }), (value) => {
            res.send({message: true});
        }, (err) => {
            res.send(err);
        })
    } else {
        res.send({message: false});
    }
})

router.post("/deleteAccount", async (req, res) => {
    let account = await Account.getAccountByUsername(req.body.accountUsername);
    if(account.accountType == "dentist") {
        Doctor.delete(account.doctorID);
    } 
    Account.delete(req.body.accountID);
    res.send({message: true});
})

router.post("/validateUsername", async (req, res) => {
    let account = await Account.getAccountByUsername(req.body.username);
    if(account == undefined) {
        res.send({message: false});
    } else {
        res.send({message: true});
    }
})

router.post("/editDentist", async (req, res) => {
    let account = await Account.findOne({_id: req.body.accountID});
    Account.updateAccount(account.id, req.body.password);
    Doctor.updateDoctor(account.doctorID, req.body.firstname, req.body.lastname);
    res.send(true);
})

router.post("/addDentist", async (req, res) => {
    let user = await Account.getAccountByUsername(req.body.username);
    if(user == undefined) {
        Doctor.addDoctor(new Doctor({
            firstname: req.body.firstname,
            lastname: req.body.lastname,
            status: req.body.status
        }), (value) => {
            Account.addAccount(new Account({
                username: req.body.username,
                password: req.body.password,
                accountType: req.body.type,
                doctorID: value.id
            }), (val) => {
                res.send({
                    message: true,
                    doctor: value
                });
            }, (err) => {
                res.send(err);
            })
        }, (err) => {
            res.send(err);
        })
    } else {
        res.send({message: false});
    }
})

router.post("/editProcess", async (req, res) => {
    let process = await Process.findOne({processname: req.body.name});
    if(process == undefined || process._id == req.body.procedureID) {
        Process.updateProcess(req.body.procedureID, req.body.name);
        res.send({message: true});
    } else {
        res.send({message: false});
    }
})

router.post("/addProcess", async (req, res) => {
    let process = await Process.findOne({
        processname: req.body.name
    });
    if(process == undefined) {
        Process.addProcess(new Process({
            processname: req.body.name
        }), (value) => {
            res.send({message: true});
        })
    } else {
        res.send({message: false});
    }
})

router.post("/deleteProcess", (req, res) => {
    Process.delete(req.body.processID);
    res.send({message: true});
})

router.post("/getUser", async (req, res) => {
    let user = await Account.findOne({username: req.body.username});
    let doctor;
    if(user.doctorID != "") {
        doctor = await Doctor.getDoctorByID(user.doctorID);
    }
    res.send({
        user,
        doctor
    });
})

router.post("/filterUser", async (req, res) => {
    let account;
    if(req.body.userType == "all") {
        account = await Account.getAccountWithoutAdmin();
    } else if (req.body.userType == "secretary") {
        account = await Account.getSecretary();
    } else if(req.body.userType == "dentist") {
        account = await Account.getDentist();
    }
    let table = fs.readFileSync('./views/module_templates/admin-users-table.hbs', 'utf-8');
    let sendData = {
        user: account
    }
    res.send({
        htmlData: table,
        data: sendData
    })
})

router.get("/adminUsers", urlencoder, async (req, res) => {
    let accounts = await Account.getAccountWithoutAdmin();
    let table = fs.readFileSync('./views/module_templates/admin-users-table.hbs', 'utf-8');
    let sendData = {
        user: accounts
    }
    res.send({
        htmlData: {
            table
        },
        data: sendData
    })
    
})

router.get("/adminDentist", urlencoder, async (req, res) => {
    let doctors = await Doctor.getAllDoctors();
    let table = fs.readFileSync('./views/module_templates/admin-dentist-table.hbs', 'utf-8');
    let sendData = {
        dentist: doctors
    }
    res.send({
        htmlData: {
            table
        },
        data: sendData
    })
})

router.get("/adminProcedure", urlencoder, async (req, res) => {
    let processes = await Process.getAllProcesses();
    let table = fs.readFileSync('./views/module_templates/admin-procedure-table.hbs', 'utf-8');
    let sendData = {
        procedure: processes
    }
    res.send({
        htmlData: {
            table
        },
        data: sendData
    })
})

router.post("/addSchedule", urlencoder, async (req, res) => {

    let doctorID = req.body.doctorID;

    let time = ['08:00:00', '18:00:00'];

    let defaultschedule = new Schedule({
        sunday: null,
        monday: time,
        tuesday: time,
        wednesday: time,
        thursday: time,
        friday: time,
        saturday: time
    })

    let mondayBreak= null;
    let tuesdayBreak = null;
    let wednesdayBreak = null;
    let thursdayBreak = null;
    let fridayBreak = null;
    let saturdayBreak = null;

    if(req.body.defaultTime == 'false'){
        let monday, tuesday, wednesday, thursday, friday, saturday;

        if(req.body.mB == 'false'){
            monday= req.body["monday[]"];
        }else{
            monday =  req.body["monday[]"]; // whole bracket
            mondayBreak = req.body["mondaydifference[]"]; // the difference of end of first session and start of second session
        }

        if(req.body.tB == 'false'){
            tuesday = req.body["tuesday[]"];
        }else{
            tuesday = req.body["tuesday[]"]; // whole bracket
            tuesdayBreak = req.body["tuesdaydifference[]"];
        }

        if(req.body.wB == 'false'){
            wednesday = req.body["wednesday[]"];
        }else{
            wednesday = req.body["wednesday[]"]; // whole bracket
            wednesdayBreak = req.body["wednesdaydifference[]"];
        }

        if(req.body.hB == 'false'){
            thursday = req.body["thursday[]"];
        }else{
            thursday = req.body["thursday[]"]; // whole bracket
            thursdayBreak = req.body["thursdaydifference[]"];
        }

        if(req.body.fB == 'false'){
            friday = req.body["friday[]"];
        }else{
            friday = req.body["friday[]"]; // whole bracket
            fridayBreak = req.body["fridaydifference[]"];
        }

        if(req.body.sB == 'false'){
            saturday = req.body["saturday[]"]; 
        }else{
            saturday =  req.body["saturday[]"]; // whole bracket
            saturdayBreak = req.body["saturdaydifference[]"];
        }
        
        defaultschedule = new Schedule({
            sunday: null,
            monday,
            tuesday,
            wednesday,
            thursday,
            friday,
            saturday
        })
    }

    let breaktime = new BreakTime({
        monday: mondayBreak,
        tuesday: tuesdayBreak,
        wednesday: wednesdayBreak,
        thursday: thursdayBreak,
        friday: fridayBreak,
        saturday: saturdayBreak
    })

    BreakTime.addBreakTime(breaktime, function(val){
        Doctor.updateDoctorBreakTime(doctorID, val._id);
    }, (error)=>{
        res.send(error);
    })

    Schedule.addschedule(defaultschedule, function(value){
        Doctor.updateDoctorSchedule(doctorID, value._id);    
        res.send(true);
    }, (error)=>{
        res.send(error);
    })
})

router.post("/editSchedule", urlencoder, async (req, res) => {

    let doctorID = req.body.doctorID;
    let doctor = await Doctor.getDoctorByID(doctorID);
    

    let mondayBreak= null;
    let tuesdayBreak = null;
    let wednesdayBreak = null;
    let thursdayBreak = null;
    let fridayBreak = null;
    let saturdayBreak = null;

    if(true /*monday does not have break*/){
        let monday= req.body["monday[]"];
    }else{
        let monday =  req.body["monday[]"]; // whole bracket
        mondayBreak = req.body["mondaydifference[]"]; // the difference of end of first session and start of second session
    }

    if(true /*tuesday does not have break*/){
        let tuesday = req.body["tuesday[]"];
    }else{
        let tuesday = req.body["tuesday[]"]; // whole bracket
        tuesdayBreak = req.body["tuesdaydifference[]"];
    }

    if(true /*wednesday does not have break*/){
        let wednesday = req.body["wednesday[]"];
    }else{
        let wednesday = req.body["wednesday[]"]; // whole bracket
        wednesdayBreak = req.body["wednesdaydifference[]"];
    }

    if(true /*thursday does not have break*/){
        let thursday = req.body["thursday[]"];
    }else{
        let thursday = req.body["thursday[]"]; // whole bracket
        thursdayBreak = req.body["thursdaydifference[]"];
    }

    if(true /*friday does not have break*/){
        let friday = req.body["friday[]"];
    }else{
        let friday = req.body["friday[]"]; // whole bracket
        fridayBreak = req.body["fridaydifference[]"];
    }

    if(true /*saturday does not have break*/){
        let saturday = req.body["saturday[]"]; 
    }else{
        let saturday =  req.body["saturday[]"]; // whole bracket
        saturdayBreak = req.body["saturdaydifference[]"];
    }
    
    let schedule = new Schedule({
        sunday: null,
        monday,
        tuesday,
        wednesday,
        thursday,
        friday,
        saturday
    })

    let breaktime = new BreakTime({
        monday: mondayBreak,
        tuesday: tuesdayBreak,
        wednesday: wednesdayBreak,
        thursday: thursdayBreak,
        friday: fridayBreak,
        saturday: saturdayBreak
    })

    BreakTime.updateBreakTime(doctor.breakTime, breaktime);
    
    Schedule.updateSchedule(doctor.schedule, schedule);
})

router.post("/getSchedule", urlencoder, async (req, res) => {
    let doctorID = req.body.doctorID;
    let doctor = await Doctor.getDoctorByID(doctorID);
    let docSched = await Schedule.getScheduleByID(doctor.schedule);
    let breaktime = await BreakTime.getBreakTimeByID(doctor.breakTime);
    let table = fs.readFileSync('./views/module_templates/admin-dentist-schedule-modal.hbs', 'utf-8');

    let array = [];
    if(docSched != undefined) {
        array = getObject(docSched, breaktime);
    }

    let sendData = {
        sched: array
    }
    res.send({
        htmlData: table,
        data: sendData,
        scheduleID: docSched._id
    })
})

var weekday = ["M","T","W","H","F","S"];

function getObject(object, breakTime) {
    let array = [];
    array.push(object.monday);
    array.push(object.tuesday);
    array.push(object.wednesday);
    array.push(object.thursday);
    array.push(object.friday);
    array.push(object.saturday);

    let objectTimeList = [];
    objectTimeList.push(new Object({
        name: "Monday",
        time: [
            {range: array[0][0] + " - " + array[0][1]}
        ]
    }));
    objectTimeList.push(new Object({
        name: "Tuesday",
        time: [
            {range: array[1][0] + " - " + array[1][1]},
            {range: array[1][0] + " - " + array[1][1]}
        ]
    }));
    objectTimeList.push(new Object({
        name: "Wednesday",
        time: [
            {range: array[2][0] + " - " + array[2][1]},
            {range: array[2][0] + " - " + array[2][1]}
        ]
    }));
    objectTimeList.push(new Object({
        name: "Thursday",
        time: [
            {range: array[3][0] + " - " + array[3][1]},
            {range: array[3][0] + " - " + array[3][1]}
        ]
    }));
    objectTimeList.push(new Object({
        name: "Friday",
        time: [
            {range: array[4][0] + " - " + array[4][1]}
        ]
    }));
    objectTimeList.push(new Object({
        name: "Saturday",
        time: [
            {range: array[5][0] + " - " + array[5][1]},
            {range: array[5][0] + " - " + array[5][1]}
        ]
    }));

    return objectTimeList;
}

router.post("/addUnavailableDates", urlencoder, async (req, res) => {
    let doctorID = req.body.doctorID;

    var start = new Date(req.body.startdate);
    let startformattedDate = moment(start).format("YYYY-MM-DD");
    var end = new Date(req.body.enddate);
    let endformattedDate = moment(end).format("YYYY-MM-DD");
   
    let unavailableDate = new UnavailableDate({
        momentDate1: req.body.startdate,
        stringDate1: startformattedDate,
        momentDate2: req.body.enddate,
        stringDate2: endformattedDate,
        doctor: doctorID
    })

    UnavailableDate.addUnavailableDate(unavailableDate, function(val){
    }, (error)=>{
        res.send(error);
    })
    
})

router.post("/getUnavailableDates", urlencoder, async (req, res) => {
    let doctorID = req.body.doctorID;
    let data = UnavailableDate.getDoctorUnavailableDates(doctorID);
    
    res.send({
        htmlData: table,
        data: data
    })   
})

router.post("/deleteUnavailableDates", urlencoder, async (req, res) => {
    UnavailableDate.delete(req.body.unavailableDateID);
    res.send({message: true});  
})

router.post("/editUnavailableDates", urlencoder, async (req, res) => {
    let unavailableDateID = req.body.unavailableDateID;

    var start = new Date(req.body.startdate);
    let startformattedDate = moment(start).format("YYYY-MM-DD");
    var end = new Date(req.body.enddate);
    let endformattedDate = moment(end).format("YYYY-MM-DD");
   
    let unavailableDate = new UnavailableDate({
        momentDate1: req.body.startdate,
        stringDate1: startformattedDate,
        momentDate2: req.body.enddate,
        stringDate2: endformattedDate,
        doctor: UnavailableDate.getUnavailableDateByID(unavailableDateID).doctor
    })

    UnavailableDate.updateUnavailableDate(unavailableDateID, unavailableDate);
})



module.exports = router;