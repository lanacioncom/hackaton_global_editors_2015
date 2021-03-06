window.onload = init;

var _c = console || {};
function init(){

    queue() // parallel request ajax
        .defer( d3.json, "../data/dict_partidos.json" )
        .defer( d3.json, "../data/dict_candidatos.json" )
        .defer( d3.json, "../data/candidatesQeQ.json" )
        // .defer( d3.json, "../data/results_paso_old.json" )
        .await( initApp );
}

function initApp(err, dict, dict_cand, data_results){
    // _c.groupCollapsed("DATA"); // logging data
    //     _c.group("dict");
    //         _c.log(dict);
    //     _c.groupEnd();
    //     _c.group("data_results");
    //         _c.log(data_results);
    //     _c.groupEnd();
    // _c.groupEnd();

    var especulometro = {}; // data acumulada para el especulometro
    
    var results = data_results.candidatos.clone(); // array resultados

    var table = d3.select( "#viz" ).append( "table" );

// cabeceras...
    var headers = [ { idp: '0', nombre_corto: "n" } ].concat( results );
    
    var th = table.append( "tr" ).selectAll( "th" )
        .data( headers, function( d ){ return d.idc; });
        
    var th_enter = th.enter() // append ca beceras th 
        .append( "th" )
        .attr( 'id', function( d ){ return "th_" + d.idc; } )
        .attr( 'class', function( d ){ return "column_" + d.idc; } )
        .html(function ( d ) { 
            if ( !d.pt_val ) {
                return "<h1>SIMULADOR DE RESULTADOS</h1><h2>A partir de los resultados de las PASO recalculá el porcentaje de votos de cada candidato y armá un escenario para el 25 de octubre</h2>"
            }
        })
        ;

    th_enter.append( 'img' )
        .attr('src', function(d){
            if (dict_cand[ d.idc ]) {
                return dict_cand[d.idc].foto;
            }
        })
    ;
    
    th_enter.append( 'div' )
        .attr( 'class', 'name' )
        .text( function( d ) {
            if (dict_cand[ d.idc ]) {
                return dict_cand[d.idc].nombre_corto;
            }
        } )
        ;
    var espec_porc = th_enter.append( 'div' )
        .attr( 'class', 'porc' )
        .style( 'color', function( d ) {
            if (dict_cand[ d.idc ]) {
                return dict_cand[d.idc].nombre_corto;
            }
        } )
        // .text( "" );
    
    var bars = th_enter.append( 'div' ).attr("class", 'content_bar').append( 'div' )
        .attr( 'id', function( d ){ return "bar_" + d.idc; } )
        .attr( 'class', 'bar' )
        .style( 'background', function( d ) {
            if( dict_cand[ d.idc ] ) {
                return dict_cand[d.idc].color_partido;
            }
        } )
        ;

// ballotage

    var ballotage = table.append("tr").attr("id", "ballotage")
        ballotage.append("td").html("<div class='result_paso'>RESULTADOS PASO<div>")
        ballotage.append("td").attr('colspan', "7").html("<div class='ballotage'>Utilizá los signo + y - para distribuir los porcentajes de votos de candidatos<div>")

// filas....
    
    var data_filas = get_rows(results);
    var filas = table.selectAll( "tr.row" )
        .data( data_filas, function( d ){ return d[ 0 ].idc; } ).enter()
        .append( "tr" )
        .attr( "id", function( d ){ return d[ 0 ].idc; } )
        .attr( "class", "row" )
        ;

    var cells = filas.selectAll( "td" ) // append celdas
        .data( function( d ){ return d; } );
    var cells_enter = cells.enter()
        .append( "td" )
        ;

    cells_enter.each( function( d, i ) {
            
            if ( !especulometro[ d.idc ] ) {
                especulometro[ d.idc ] = 0;
            }
            
            var el = d3.select( this );

            var column = d.idc;
            var paso_id = this.parentNode.id;

            if( i === 0 ){ // resultado paso
                el.attr( "id", function( d ){ return "paso_" + d.idc;  } ); 
                el.append( "div" ).attr( "class", "paso_porc" ).text(function( d ){ return d.pt_val + "%"; } );
                el.append( "div" ).attr( "class", "paso_name" ).text(function( d ){ return dict_cand[ d.idc ].nombre_corto; } );
                el.append( "div" ).attr( "class", function( d ){ return "paso_bar"; } )
                    .style("background", function( d ){ return dict_cand[d.idc].color_partido; })
                
                el.append( "div" ).attr( "class", "bar_fondo")
                    ;
                
            }else{ // mas y menos para cada partido pro fila
                el.attr( "class", function( d ) { return "column_" + d.idc;  });
                if( this.parentNode.id == d.idc ){
                    el.classed( "same", true );
                }
                el.append( "span" ).attr( "data-type", "+" ).attr( "data-paso_id", paso_id ).attr( "class", "btn mas" ).attr( "title", "mas 1" ).text( "+" );
                el.append( "span" ).attr( "data-type", "-" ).attr( "data-paso_id", paso_id ).attr( "class", "btn menos" ).attr( "title", "menos 1" ).text( "-" );
                el.append( "span" ).attr( "data-type", "++" ).attr( "data-paso_id", paso_id ).attr( "class", "btn todos" ).attr( "title", "todo" ).text( "++" );
            }
        });
    
    update();
    

    d3.selectAll( "td .btn" ).on( "click", function(d, i) { // click +, - or ++
        

        var op = this.dataset.type; // operador (+, -, ++)
        var paso_id = this.dataset.paso_id;
        var espec_id = d.idc;
        // var paso = d3.select("#paso_"+row);

        var r = data_filas.filter(function(x){ return x[0].idc == paso_id; })[0][0]; // get nodo desde los resultados para modificar

        switch(op){  // set data values
            
            case "+":
                if(r.pt_val > 1){ // suma 1% al seleccionado
                    r.pt_val -=1; // resto 1 al porcentaje paso 
                    especulometro[espec_id] += 1; // +1 al especulometro seleccionado
                }else{
                    especulometro[espec_id] += r.pt_val; // +1 al especulometro seleccionado
                    r.pt_val = 0;
                }
                break;
            
            case "++":
                especulometro[espec_id] += r.pt_val; // +1 al especulometro seleccionado
                r.pt_val = 0;
                break;
            
            case "-":
                if(especulometro[espec_id] > 1){ // suma 1% al seleccionado
                    especulometro[espec_id] -=1; // resto 1 al porcentaje paso 
                    r.pt_val += 1; // +1 suma al dato paso
                }else{
                    r.pt_val += especulometro[espec_id]; // +1 al especulometro seleccionado
                    especulometro[espec_id] = 0;
                }
                break;
            
            default:
                break;
        }

        update();
        d3.event.preventDefault()
    });
    

    function update(){
        // update bars
        bars.transition().duration(700).style("width", function( d ){ return especulometro[d.idc] + "px"; });
        espec_porc.text(function( d ){ return ( especulometro[ d.idc ] ? especulometro[d.idc].toFixed( 2 ) : 0 ) + "%"; });
        // update cells
        cells.each(function(d, i){
            var el = d3.select(this);

            var column = d.idc;
            var row = this.parentNode.id;

            if(i === 0){ // resultado paso
                el.select("div.paso_bar").transition().duration(700)
                    .style("width", function(d ){ return (d.pt_val*2) + "px"; })
                    ;
                el.select("div.paso_porc").text(function( d ){ return d.pt_val.toFixed(2) + "%"; });
                
            }else{ // mas y menos para cada partido pro fila
            
            }
        });
    }

}

function get_rows ( results ) {
    var rows = results.map( function( x ) { 
        return [ x ].concat( results ); 
    } );
    return rows;
}
