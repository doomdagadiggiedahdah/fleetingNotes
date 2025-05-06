"use strict";
var __makeTemplateObject = (this && this.__makeTemplateObject) || function (cooked, raw) {
    if (Object.defineProperty) { Object.defineProperty(cooked, "raw", { value: raw }); } else { cooked.raw = raw; }
    return cooked;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getServersWithDeployments = getServersWithDeployments;
exports.pullTrainingData = pullTrainingData;
var db_1 = require("@/db");
var schema_1 = require("@/db/schema");
var drizzle_orm_1 = require("drizzle-orm");
var braintrust_1 = require("braintrust");
/**
 * Fetches all servers that have had deployment attempts, including both successful and failed deployments.
 * @returns An array of servers with their deployment statistics
 */
function getServersWithDeployments() {
    return __awaiter(this, void 0, void 0, function () {
        var serversWithDeployments;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, db_1.db
                        .select({
                        id: schema_1.servers.id,
                        qualifiedName: schema_1.servers.qualifiedName,
                        displayName: schema_1.servers.displayName,
                        description: schema_1.servers.description,
                        repoOwner: schema_1.serverRepos.repoOwner,
                        repoName: schema_1.serverRepos.repoName,
                        baseDirectory: schema_1.serverRepos.baseDirectory,
                        latestStatus: (0, drizzle_orm_1.sql)(templateObject_1 || (templateObject_1 = __makeTemplateObject(["FIRST_VALUE(", ") OVER (PARTITION BY ", " ORDER BY ", " DESC)"], ["FIRST_VALUE(", ") OVER (PARTITION BY ", " ORDER BY ", " DESC)"])), schema_1.deployments.status, schema_1.servers.id, schema_1.deployments.createdAt),
                        deploymentUrl: (0, drizzle_orm_1.sql)(templateObject_2 || (templateObject_2 = __makeTemplateObject(["FIRST_VALUE(", ") OVER (PARTITION BY ", " ORDER BY ", " DESC)"], ["FIRST_VALUE(", ") OVER (PARTITION BY ", " ORDER BY ", " DESC)"])), schema_1.deployments.deploymentUrl, schema_1.servers.id, schema_1.deployments.createdAt),
                    })
                        .from(schema_1.servers)
                        .innerJoin(schema_1.deployments, (0, drizzle_orm_1.eq)(schema_1.deployments.serverId, schema_1.servers.id))
                        .innerJoin(schema_1.serverRepos, (0, drizzle_orm_1.eq)(schema_1.serverRepos.serverId, schema_1.servers.id))
                        .groupBy(schema_1.servers.id, schema_1.deployments.status, schema_1.deployments.deploymentUrl, schema_1.deployments.createdAt, schema_1.serverRepos.repoOwner, schema_1.serverRepos.repoName, schema_1.serverRepos.baseDirectory)];
                case 1:
                    serversWithDeployments = _a.sent();
                    return [2 /*return*/, serversWithDeployments];
            }
        });
    });
}
/**
 * Based on deployed servers, pull a dataset for evaluation.
 * We also pull attempted by failed servers as a benchmark.
 */
function pullTrainingData() {
    return __awaiter(this, void 0, void 0, function () {
        var servers, successCount, dataset, _i, servers_1, server, _a, _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, getServersWithDeployments()];
                case 1:
                    servers = _c.sent();
                    successCount = servers.filter(function (s) { return s.latestStatus === "SUCCESS"; }).length;
                    console.log("% deployment success: ".concat((successCount / servers.length) * 100, "%"));
                    dataset = (0, braintrust_1.initDataset)("Smithery", { dataset: "eval-dataset" });
                    for (_i = 0, servers_1 = servers; _i < servers_1.length; _i++) {
                        server = servers_1[_i];
                        dataset.insert({
                            id: server.id,
                            input: {
                                id: server.id,
                                repoOwner: server.repoOwner,
                                repoName: server.repoName,
                                baseDirectory: server.baseDirectory,
                            },
                        });
                    }
                    _b = (_a = console).log;
                    return [4 /*yield*/, dataset.summarize()];
                case 2:
                    _b.apply(_a, [_c.sent()]);
                    return [2 /*return*/];
            }
        });
    });
}
pullTrainingData();
var templateObject_1, templateObject_2;
