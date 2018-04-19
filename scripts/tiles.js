var TILES = 
{
    floor: 0,
    wall: 1,
    output: 2,
    input: 3,
    hardTWall: 4, //toggleable wall
    softTWall: 5
}

function makeTileFromIndex (index, x, y, data) 
{
    switch (index) {
        default:
            return new PuzzleTile(index, x, y, undefined, data);
            break;

        case TILES.floor:
            return new Floor(x, y, data);
            break;

        case TILES.wall:
            return new Wall(x, y, data);
            break;
    }
}

var PuzzleTile = new Phaser.Class({

    Extends: Phaser.Tilemaps.Tile,

    initialize: function (index, x, y, layer, data) 
    {
        layer = (layer !== undefined) ? layer : 'room';
        layer = gameScene.map.getLayer(layer);
        Phaser.Tilemaps.Tile.call(this, layer, index, x, y, gameScene.tileSize, gameScene.tileSize);

        data = (data !== undefined) ? data : {};
        this.isSolid = (data.isSolid !== undefined) ? data.isSolid : true;
    },

    getData: function ()
    {
        var tileName = "unknown";
        for(var name in TILES) {
            if (TILES[name] === this.index) 
            {
                tileName = name;
                break;
            }
        }
        // return {
        //     index: this.index,
        //     type: tileName
        // }
        return this.index
    },

    addToLayer: function () 
    {
        if (this.x >= gameScene.map.width || this.y >= gameScene.map.height) return;
        // console.log(this.x, this.y);
        gameScene.map.getLayer(this.layer.name).data[this.y][this.x] = this;
    }
});

var Floor = new Phaser.Class({

    Extends: PuzzleTile,

    initialize: function (x, y, data)
    {
        PuzzleTile.call(this, TILES.floor, x, y, 'room', data);

        this.isSolid = false;
    }
});

var Wall = new Phaser.Class({

    Extends: PuzzleTile,

    initialize: function (x, y, data)
    {
        PuzzleTile.call(this, TILES.wall, x, y, 'room', data);
    }
});

var Wire = new Phaser.Class({

    Extends: PuzzleTile,

    initialize: function (x, y, data) 
    {
        PuzzleTile.call(this, 0, x, y, 'wires', data);

        this.powered = false;
        this.north = false;
        this.south = false;
        this.east = false;
        this.west = false;

        this.connectableTiles = [TILES.input, TILES.output];
        this.tileDirectionIndicies = {
            '': 0,
            'N': 1,   'S': 1,    'NS': 1,
            'E': 2,   'W': 2,    'EW': 2,
            'SE': 3,  'SEW': 4,  'SW': 5,
            'NSE': 6, 'NSEW': 7, 'NSW': 8,
            'NE': 9,  'NEW': 10, 'NW': 11
        }

        gameScene.updateWires();
    },

    findPathToPowerSource:  function (checkedTiles) 
    {
        if(checkedTiles.indexOf(this) !== -1) return false;
        if (this.hasNeighboringPowerSource()) return true;
        else {
            checkedTiles.push(this);
            var neighbors = this.getWireNeighbors();
            for (var i=0; i<neighbors.length; i++) 
            {
                if (neighbors[i].findPathToPowerSource(checkedTiles)) return true;
            }
        }
        return false;
    },

    isConnectableWith: function (x, y) 
    {
        let tile = this.tilemap.getTileAt(x, y, true, 'wires');
        if (tile.index !== -1) return true;

        tile = this.tilemap.getTileAt(x, y, true, 'room');
        if (this.connectableTiles.indexOf(tile.index) != -1) return true;
        return false;
    },

    getDirectionIndex: function () 
    {
        let dir = '';
        if (this.north) dir += 'N';
        if (this.south) dir += 'S';
        if (this.east) dir += 'E';
        if (this.west) dir += 'W';
        return this.tileDirectionIndicies[dir];
    },

    getWireNeighbors: function () 
    {
        var neighbors = [];

        var tile = this.tilemap.getTileAt(this.x, this.y-1, null, 'wires');
        if (this.north && tile !== null) neighbors.push(tile);

        tile = this.tilemap.getTileAt(this.x, this.y+1, null, 'wires');
        if (this.south && tile !== null) neighbors.push(tile);

        tile = this.tilemap.getTileAt(this.x+1, this.y, null, 'wires');
        if (this.east && tile !== null) neighbors.push(tile);

        tile = this.tilemap.getTileAt(this.x-1, this.y, null, 'wires');
        if (this.west && tile !== null) neighbors.push(tile);

        return neighbors;
    },

    getRoomNeighbors: function () 
    {
        var neighbors = [];

        var tile = this.tilemap.getTileAt(this.x, this.y-1, null, 'room');
        if (this.north && tile !== null) neighbors.push(tile);

        tile = this.tilemap.getTileAt(this.x, this.y+1, null, 'room');
        if (this.south && tile !== null) neighbors.push(tile);

        tile = this.tilemap.getTileAt(this.x+1, this.y, null, 'room');
        if (this.east && tile !== null) neighbors.push(tile);

        tile = this.tilemap.getTileAt(this.x-1, this.y, null, 'room');
        if (this.west && tile !== null) neighbors.push(tile);

        return neighbors;
    },

    hasNeighboringPowerSource: function () 
    {
        var neighbors = this.getRoomNeighbors();
        for(var i=0; i<neighbors.length; i++) 
        {
            if (neighbors[i].index === TILES.output) return true;
        }
        return false;
    },

    hasNeighboringPowerInput: function () 
    {
        var neighbors = this.getRoomNeighbors();
        for(var i=0; i<neighbors.length; i++) 
        {
            if (neighbors[i].index === TILES.input) return true;
        }
        return false;
    },

    break: function () 
    {
        this.tilemap.putTileAt(-1, this.x, this.y, null, 'wires');
        gameScene.updateWires();
    },

    updateColor: function () 
    {
        //set color
        if (this.powered === true)
            this.tint = gameScene.colors.powered_blue;
        else
            this.tint = gameScene.colors.unpowered_blue;
    },

    updateConnections: function () 
    {
        this.north = this.isConnectableWith(this.x, this.y - 1);
        this.south = this.isConnectableWith(this.x, this.y + 1);
        this.east = this.isConnectableWith(this.x + 1, this.y);
        this.west = this.isConnectableWith(this.x - 1, this.y);
        this.index = this.getDirectionIndex();
    }
});