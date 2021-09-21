import deepEqual from 'deep-equal';
import {
  ArgumentDefinition,
  InputObjectType,
  InputType,
  isEnumType,
  isInputObjectType,
  isListType,
  isNonNullType,
  isScalarType,
  isVariable,
  Variable,
  VariableDefinition,
  VariableDefinitions,
  Variables
} from './definitions';
import { ArgumentNode, GraphQLError, Kind, ValueNode } from 'graphql';
import { didYouMean, suggestionList } from './suggestions';
import { inspect } from 'util';
import { sameType } from './types';

export function valueToString(v: any, expectedType?: InputType): string {
  if (v === undefined || v === null) {
    if (expectedType && isNonNullType(expectedType)) {
      throw buildError(`Invalid undefined/null value for non-null type ${expectedType}`);
    }
    return "null";
  }

  if (expectedType && isNonNullType(expectedType)) {
    expectedType = expectedType.ofType;
  }

  if (isVariable(v)) {
    return v.toString();
  }


  if (Array.isArray(v)) {
    let elementsType: InputType | undefined = undefined;
    if (expectedType) {
      if (!isListType(expectedType)) {
        throw buildError(`Invalid list value for non-list type ${expectedType}`);
      }
      elementsType = expectedType.ofType;
    }
    return '[' + v.map(e => valueToString(e, elementsType)).join(', ') + ']';
  }

  if (typeof v === 'object') {
    if (expectedType && !isInputObjectType(expectedType)) {
      throw buildError(`Invalid object value for non-input-object type ${expectedType}`);
    }
    return '{' + Object.keys(v).map(k => {
      let valueType = expectedType ? (expectedType as InputObjectType).field(k)?.type : undefined;
      return `${k}: ${valueToString(v[k], valueType)}`;
    }).join(', ') + '}';
  }

  if (typeof v === 'string') {
    if (expectedType) {
      if (isEnumType(expectedType)) {
        return v;
      }
      if (expectedType === expectedType.schema()!.idType() && integerStringRegExp.test(v)) {
        return v;
      }
    }
    return JSON.stringify(v);
  }

  return String(v);
}

export function valueEquals(a: any, b: any): boolean {
  return deepEqual(a, b);
}

function buildError(message: string): Error {
  // Maybe not the right error for this?
  return new Error(message);
}

function applyDefaultValues(value: any, type: InputType): any {
  if (isVariable(value)) {
    return value;
  }

  if (value === null) {
    if (isNonNullType(type)) {
      throw new GraphQLError(`Invalid null value for non-null type ${type} while computing default values`);
    }
    return null;
  }

  if (isNonNullType(type)) {
    return applyDefaultValues(value, type.ofType);
  }

  if (isListType(type)) {
    if (Array.isArray(value)) {
      return value.map(v => applyDefaultValues(v, type.ofType));
    } else {
      return applyDefaultValues(value, type.ofType);
    }
  }

  if (isInputObjectType(type)) {
    if (typeof value !== 'object') {
      throw new GraphQLError(`Expected value for type ${type} to be an object, but is ${typeof value}.`);
    }

    const updated = Object.create(null);
    for (const field of type.fields()) {
      if (!field.type) {
        throw buildError(`Cannot compute default value for field ${field.name} of ${type} as the field type is undefined`);
      }
      const fieldValue = value[field.name];
      if (fieldValue === undefined) {
        if (field.defaultValue !== undefined) {
          updated[field.name] = applyDefaultValues(field.defaultValue, field.type);
        } else if (isNonNullType(field.type)) {
          throw new GraphQLError(`Field "${field.name}" of required type ${type} was not provided.`);
        }
      } else {
        updated[field.name] = applyDefaultValues(fieldValue, field.type);
      }
    }

    // Ensure every provided field is defined.
    for (const fieldName of Object.keys(value)) {
      if (!type.field(fieldName)) {
        const suggestions = suggestionList(fieldName, [...type.fields()].map(f => f.name));
        throw new GraphQLError(`Field "${fieldName}" is not defined by type "${type}".` + didYouMean(suggestions));
      }
    }
    return updated;
  }
  return value;
}

export function withDefaultValues(value: any, argument: ArgumentDefinition<any>): any {
  if (!argument.type) {
    throw buildError(`Cannot compute default value for argument ${argument} as the type is undefined`);
  }
  if (value === undefined) {
    if (argument.defaultValue) {
      return applyDefaultValues(argument.defaultValue, argument.type);
    }
  }
  return applyDefaultValues(value, argument.type);
}

const integerStringRegExp = /^-?(?:0|[1-9][0-9]*)$/;

// Adapted from the `astFromValue` function in graphQL-js
export function valueToAST(value: any, type: InputType): ValueNode | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (isNonNullType(type)) {
    const astValue = valueToAST(value, type.ofType);
    if (astValue?.kind === Kind.NULL) {
      throw buildError(`Invalid null value ${valueToString(value)} for non-null type ${type}`);
    }
     return astValue;
  }

  // only explicit null, not undefined, NaN
  if (value === null) {
    return { kind: Kind.NULL };
  }

  if (isVariable(value)) {
    return { kind: Kind.VARIABLE, name: { kind: Kind.NAME, value: value.name } };
  }

  // Convert JavaScript array to GraphQL list. If the GraphQLType is a list, but
  // the value is not an array, convert the value using the list's item type.
  if (isListType(type)) {
    const itemType: InputType = type.ofType;
    const items = Array.from(value);
    if (items != null) {
      const valuesNodes = [];
      for (const item of items) {
        const itemNode = valueToAST(item, itemType);
        if (itemNode != null) {
          valuesNodes.push(itemNode);
        }
      }
      return { kind: Kind.LIST, values: valuesNodes };
    }
    return valueToAST(value, itemType);
  }

  // Populate the fields of the input object by creating ASTs from each value
  // in the JavaScript object according to the fields in the input type.
  if (isInputObjectType(type)) {
    if (typeof value !== 'object') {
      throw buildError(`Invalid non-objet value for input type ${type}, cannot be converted to AST: ${inspect(value)}`);
    }
    const fieldNodes = [];
    for (const field of type.fields()) {
      if (!field.type) {
        throw buildError(`Cannot convert value ${valueToString(value)} as field ${field} has no type set`);
      }
      const fieldValue = valueToAST(value[field.name], field.type);
      if (fieldValue) {
        fieldNodes.push({
          kind: Kind.OBJECT_FIELD,
          name: { kind: Kind.NAME, value: field.name },
          value: fieldValue,
        });
      }
    }
    return { kind: Kind.OBJECT, fields: fieldNodes };
  }

  // TODO: we may have to handle some coercions (not sure it matters in our use case
  // though).

  if (typeof value === 'boolean') {
    return { kind: Kind.BOOLEAN, value: value };
  }

  if (typeof value === 'number' && isFinite(value)) {
    const stringNum = String(value);
    return integerStringRegExp.test(stringNum)
      ? { kind: Kind.INT, value: stringNum }
      : { kind: Kind.FLOAT, value: stringNum };
  }

  if (typeof value === 'string') {
    // Enum types use Enum literals.
    if (isEnumType(type)) {
      return { kind: Kind.ENUM, value: value };
    }

    // ID types can use Int literals.
    if (type === type.schema()?.idType() && integerStringRegExp.test(value)) {
      return { kind: Kind.INT, value: value };
    }

    return {
      kind: Kind.STRING,
      value: value,
    };
  }

  throw buildError(`Invalid value for type ${type}, cannot be converted to AST: ${inspect(value)}`);
}

// see https://spec.graphql.org/draft/#IsVariableUsageAllowed()
function isValidVariable(variable: VariableDefinition, locationType: InputType, locationDefault: any): boolean {
  const variableType = variable.type;

  if (isNonNullType(locationType) && !isNonNullType(variableType)) {
    const hasVariableDefault = variable.defaultValue !== undefined && variable.defaultValue !== null;
    const hasLocationDefault = locationDefault !== undefined;
    if (!hasVariableDefault && !hasLocationDefault) {
      return false;
    }
    return areTypesCompatible(variableType, locationType.ofType);
  }

  return areTypesCompatible(variableType, locationType);
}

// see https://spec.graphql.org/draft/#AreTypesCompatible()
function areTypesCompatible(variableType: InputType, locationType: InputType): boolean {
  if (isNonNullType(locationType)) {
    if (!isNonNullType(variableType)) {
      return false;
    }
    return areTypesCompatible(variableType.ofType, locationType.ofType);
  }
  if (isNonNullType(variableType)) {
    return areTypesCompatible(variableType.ofType, locationType);
  }
  if (isListType(locationType)) {
    if (!isListType(variableType)) {
      return false;
    }
    return areTypesCompatible(variableType.ofType, locationType.ofType);
  }
  return !isListType(variableType) && sameType(variableType, locationType);
}

export function isValidValue(value: any, argument: ArgumentDefinition<any>, variableDefinitions: VariableDefinitions): boolean {
  return isValidValueApplication(value, argument.type!, argument.defaultValue, variableDefinitions);
}

function isValidValueApplication(value: any, locationType: InputType, locationDefault: any, variableDefinitions: VariableDefinitions): boolean {
  // Note that this needs to be first, or the recursive call within 'isNonNullType' would break for variables
  if (isVariable(value)) {
    const definition = variableDefinitions.definition(value);
    return !!definition && isValidVariable(definition, locationType, locationDefault);
  }

  if (isNonNullType(locationType)) {
    return value !== null && isValidValueApplication(value, locationType.ofType, undefined, variableDefinitions);
  }

  if (value === null || value === undefined) {
    return true;
  }

  if (isListType(locationType)) {
    const itemType: InputType = locationType.ofType;
    if (Array.isArray(value)) {
      return value.every(item => isValidValueApplication(item, itemType, undefined, variableDefinitions));
    }
    // Equivalent of coercing non-null element as a list of one.
    return isValidValueApplication(value, itemType, locationDefault, variableDefinitions);
  }

  if (isInputObjectType(locationType)) {
    if (typeof value !== 'object') {
      return false;
    }
    const isValid = [...locationType.fields()].every(field => isValidValueApplication(value[field.name], field.type!, undefined, variableDefinitions));
    return isValid;
  }

  // TODO: we may have to handle some coercions (not sure it matters in our use case
  // though).
  const schema = locationType.schema()!;

  if (typeof value === 'boolean') {
    return locationType === schema.booleanType();
  }

  if (typeof value === 'number' && isFinite(value)) {
    const stringNum = String(value);
    if (locationType === schema.intType() || locationType === schema.idType()) {
      return integerStringRegExp.test(stringNum);
    }
    return locationType === schema.floatType();
  }

  if (typeof value === 'string') {
    if (isEnumType(locationType)) {
      return locationType.value(value) !== undefined;
    }
    return isScalarType(locationType)
      && locationType !== schema.booleanType()
      && locationType !== schema.intType()
      && locationType !== schema.floatType();
  }
  return false;
}

export function valueFromAST(node: ValueNode): any {
  switch (node.kind) {
    case Kind.NULL:
      return null;
    case Kind.INT:
      return parseInt(node.value, 10);
    case Kind.FLOAT:
      return parseFloat(node.value);
    case Kind.STRING:
    case Kind.ENUM:
    case Kind.BOOLEAN:
      return node.value;
    case Kind.LIST:
      return node.values.map(valueFromAST);
    case Kind.OBJECT:
      const obj = Object.create(null);
      node.fields.forEach(f => obj[f.name.value] = valueFromAST(f.value));
      return obj;
    case Kind.VARIABLE:
      return new Variable(node.name.value);
  }
}

export function argumentsFromAST(args: readonly ArgumentNode[] | undefined): {[key: string]: any} {
  const values = Object.create(null);
  if (args) {
    for (const argNode of args) {
      values[argNode.name.value] = valueFromAST(argNode.value);
    }
  }
  return values;
}

export function variablesInValue(value: any): Variables {
  const variables: Variable[] = [];
  collectVariables(value, variables);
  return variables;
}

function collectVariables(value: any, variables: Variable[]) {
  if (isVariable(value)) {
    if (!variables.some(v => v.name === value.name)) {
      variables.push(value);
    }
    return;
  }

  if (Array.isArray(value)) {
    value.forEach(v => collectVariables(v, variables));
  }

  if (typeof value === 'object') {
    Object.keys(value).forEach(k => collectVariables(value[k], variables));
  }
}
